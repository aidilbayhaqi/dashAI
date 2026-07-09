from __future__ import annotations

import ast
import py_compile
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


PROJECT_FILE = Path(
    "apps/backend/src/modules/auth/service_auth.py"
)
TOKEN_STORE_FILE = Path(
    "apps/backend/src/security/authentication/token_store.py"
)


REFRESH_METHOD = '''
    # =========================================================
    # REFRESH TOKEN
    # =========================================================

    async def refresh(
        self,
        refresh_token: str,
    ) -> TokenResponse:
        """
        Memutar refresh token secara atomic di Redis.

        Method ini tidak mengubah logic login/register. Refresh token
        lama hanya dapat dipakai satu kali dan token baru tetap
        dikembalikan secara internal agar route dapat memasangnya
        sebagai HttpOnly cookie.
        """
        try:
            payload = decode_token(
                refresh_token
            )

        except ValueError as exc:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="Invalid refresh token",
            ) from exc

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="Invalid token type",
            )

        old_jti = payload.get("jti")

        if not old_jti:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Refresh token JTI "
                    "tidak tersedia."
                ),
            )

        subject = payload.get("sub")

        if not subject:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="Invalid token subject",
            )

        try:
            user_id = UUID(
                str(subject)
            )

        except ValueError as exc:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="Invalid token subject",
            ) from exc

        user = await self.get_user_by_id(
            user_id
        )

        if user is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="User not found",
            )

        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "User account "
                    "is not active"
                ),
            )

        selected_access: (
            UserCompanyAccess | None
        ) = None

        company_id = payload.get(
            "company_id"
        )

        if company_id:
            try:
                parsed_company_id = UUID(
                    str(company_id)
                )

            except ValueError as exc:
                raise HTTPException(
                    status_code=(
                        status.HTTP_401_UNAUTHORIZED
                    ),
                    detail="Invalid company context",
                ) from exc

            selected_access = (
                await self._get_company_access(
                    user.id,
                    parsed_company_id,
                )
            )

            if (
                selected_access is None
                and not user.is_superuser
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_403_FORBIDDEN
                    ),
                    detail=(
                        "User has no active access "
                        "to this company"
                    ),
                )

        permissions, branch_ids = (
            self._access_context(
                selected_access
            )
        )

        selected_company_id = (
            str(selected_access.company_id)
            if selected_access
            else None
        )

        role_id = (
            str(selected_access.role_id)
            if selected_access
            else None
        )

        claims = {
            "email": user.email,
            "full_name": user.full_name,
            "is_superuser": user.is_superuser,
            "company_id": selected_company_id,
            "role_id": role_id,
            "permissions": permissions,
            "branch_ids": branch_ids,
        }

        new_access_token = (
            create_access_token(
                user_id=str(user.id),
                claims=claims,
            )
        )

        new_refresh_token = (
            create_refresh_token(
                user_id=str(user.id),
                claims={
                    "company_id": (
                        selected_company_id
                    ),
                },
            )
        )

        new_refresh_payload = (
            decode_token(
                new_refresh_token
            )
        )

        try:
            was_rotated = (
                await rotate_refresh_token(
                    old_jti=str(old_jti),
                    new_payload=(
                        new_refresh_payload
                    ),
                )
            )

        except Exception as exc:
            logger.exception(
                "Failed to rotate refresh "
                "token in Redis"
            )

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "Layanan session sedang "
                    "bermasalah. Coba lagi."
                ),
            ) from exc

        if not was_rotated:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Refresh token revoked, "
                    "expired, or already used"
                ),
            )

        return TokenResponse(
            access_token=(
                new_access_token
            ),
            refresh_token=(
                new_refresh_token
            ),
            token_type="bearer",
        )
'''.lstrip("\n")


def find_auth_service(tree: ast.Module) -> ast.ClassDef:
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "AuthService":
            return node

    raise RuntimeError("class AuthService tidak ditemukan")


def has_method(class_node: ast.ClassDef, name: str) -> bool:
    return any(
        isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == name
        for node in class_node.body
    )


def add_rotate_import(source: str) -> str:
    if "rotate_refresh_token" in source:
        return source

    pattern = re.compile(
        r"from src\.security\.authentication\.token_store import \(\n"
        r"(?P<body>.*?)"
        r"\n\)",
        re.DOTALL,
    )

    match = pattern.search(source)

    if not match:
        raise RuntimeError(
            "Import token_store multi-line tidak ditemukan; "
            "file tidak diubah."
        )

    body = match.group("body")
    indentation = "    "

    new_body = (
        f"{indentation}rotate_refresh_token,\n"
        f"{body}"
    )

    return (
        source[: match.start("body")]
        + new_body
        + source[match.end("body") :]
    )


def insert_refresh_method(source: str) -> str:
    tree = ast.parse(source)
    auth_service = find_auth_service(tree)

    if has_method(auth_service, "refresh"):
        print("ℹ️ AuthService.refresh() sudah tersedia; tidak ada perubahan method.")
        return source

    lines = source.splitlines(keepends=True)

    marker = "    # REFRESH TOKEN"
    marker_index = next(
        (
            index
            for index, line in enumerate(lines)
            if marker in line
        ),
        None,
    )

    if marker_index is not None:
        section_start = marker_index

        while (
            section_start > 0
            and "# ===" in lines[section_start - 1]
        ):
            section_start -= 1

        next_section = next(
            (
                index
                for index in range(marker_index + 1, len(lines))
                if lines[index].startswith("    # ===")
            ),
            None,
        )

        if next_section is not None:
            lines[section_start:next_section] = [REFRESH_METHOD + "\n"]
        else:
            lines[section_start:] = [REFRESH_METHOD + "\n"]

        return "".join(lines)

    insert_at = auth_service.end_lineno

    lines.insert(
        insert_at,
        "\n" + REFRESH_METHOD,
    )

    return "".join(lines)


def validate_token_store() -> None:
    if not TOKEN_STORE_FILE.exists():
        raise RuntimeError(
            f"File token store tidak ditemukan: {TOKEN_STORE_FILE}"
        )

    token_store_source = TOKEN_STORE_FILE.read_text(encoding="utf-8")
    token_store_tree = ast.parse(token_store_source)

    function_names = {
        node.name
        for node in token_store_tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }

    if "rotate_refresh_token" not in function_names:
        raise RuntimeError(
            "token_store.py belum memiliki rotate_refresh_token(). "
            "File service_auth.py tidak diubah."
        )


def main() -> int:
    if not PROJECT_FILE.exists():
        print(
            f"❌ File tidak ditemukan: {PROJECT_FILE}",
            file=sys.stderr,
        )
        return 1

    try:
        validate_token_store()

        original = PROJECT_FILE.read_text(encoding="utf-8")
        tree = ast.parse(original)
        auth_service = find_auth_service(tree)

        if has_method(auth_service, "refresh"):
            print("✅ AuthService.refresh() sudah ada. Tidak ada file yang diubah.")
            return 0

        updated = add_rotate_import(original)
        updated = insert_refresh_method(updated)

        # Validasi source sebelum menyentuh file utama.
        ast.parse(updated)

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = PROJECT_FILE.with_suffix(
            f".py.backup-{timestamp}"
        )

        shutil.copy2(PROJECT_FILE, backup)
        PROJECT_FILE.write_text(updated, encoding="utf-8", newline="\n")

        try:
            py_compile.compile(
                str(PROJECT_FILE),
                doraise=True,
            )
        except Exception:
            shutil.copy2(backup, PROJECT_FILE)
            raise

        print(f"✅ Auth refresh berhasil ditambahkan: {PROJECT_FILE}")
        print(f"🛡️ Backup dibuat: {backup}")
        return 0

    except Exception as exc:
        print(f"❌ Perbaikan dibatalkan: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
