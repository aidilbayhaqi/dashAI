import logging
from datetime import datetime
from uuid import UUID

from fastapi import (
    HTTPException,
    status,
)
from sqlalchemy import (
    func,
    or_,
    select,
)
from sqlalchemy.exc import (
    IntegrityError,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from sqlalchemy.orm import (
    selectinload,
)

from src.modules.auth.schema_auth import (
    AuthUserResponse,
    LoginResponse,
    RegisterRequest,
    TokenResponse,
)
from src.modules.company.model_company import (
    BranchType,
    Company,
    CompanyBranch,
    CompanyStatus,
)
from src.modules.users.model_user import (
    AccessScope,
    PermissionAction,
    User,
    UserBranchAccess,
    UserCompanyAccess,
    UserPermission,
    UserRole,
    UserRolePermission,
    UserStatus,
)
from src.security.authentication.hash import (
    hash_password,
    verify_password,
)
from src.security.authentication.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from src.security.authentication.token_store import (
    rotate_refresh_token,
    store_refresh_token,
)
from src.security.redis.rate_limit import (
    check_login_rate_limit,
    increase_login_attempt,
    reset_login_attempt,
)


logger = logging.getLogger(__name__)


def build_permission_key(
    permission: UserPermission,
) -> str:
    action = getattr(
        permission.action,
        "value",
        permission.action,
    )

    return (
        f"{permission.module_code}."
        f"{permission.feature_code}."
        f"{action}"
    )


class AuthService:
    def __init__(
        self,
        db: AsyncSession,
    ):
        self.db = db

    # =========================================================
    # GENERAL HELPERS
    # =========================================================

    @staticmethod
    def _clean_optional(
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()

        return normalized or None

    @staticmethod
    def _normalize_email(
        email: str,
    ) -> str:
        return email.strip().lower()

    # =========================================================
    # USER AND ACCESS QUERIES
    # =========================================================

    async def _get_user_by_email(
        self,
        email: str,
    ) -> User | None:
        normalized_email = (
            self._normalize_email(email)
        )

        result = await self.db.execute(
            select(User)
            .where(
                func.lower(User.email)
                == normalized_email
            )
            .options(
                selectinload(
                    User.company_accesses
                )
                .selectinload(
                    UserCompanyAccess.role
                )
                .selectinload(
                    UserRole.permissions
                )
                .selectinload(
                    UserRolePermission.permission
                ),
                selectinload(
                    User.company_accesses
                )
                .selectinload(
                    UserCompanyAccess.branch_accesses
                ),
            )
        )

        return result.scalar_one_or_none()

    async def _get_company_access(
        self,
        user_id: UUID,
        company_id: UUID,
    ) -> UserCompanyAccess | None:
        result = await self.db.execute(
            select(UserCompanyAccess)
            .where(
                UserCompanyAccess.user_id
                == user_id,
                UserCompanyAccess.company_id
                == company_id,
                UserCompanyAccess.is_active
                .is_(True),
            )
            .options(
                selectinload(
                    UserCompanyAccess.role
                )
                .selectinload(
                    UserRole.permissions
                )
                .selectinload(
                    UserRolePermission.permission
                ),
                selectinload(
                    UserCompanyAccess.branch_accesses
                ),
            )
        )

        return result.scalar_one_or_none()

    async def get_user_by_id(
        self,
        user_id: UUID,
    ) -> User | None:
        result = await self.db.execute(
            select(User).where(
                User.id == user_id
            )
        )

        return result.scalar_one_or_none()

    # =========================================================
    # TOKEN AND PERMISSION HELPERS
    # =========================================================

    @staticmethod
    def _access_context(
        access: UserCompanyAccess | None,
    ) -> tuple[
        list[str],
        list[str],
    ]:
        permissions: list[str] = []
        branch_ids: list[str] = []

        if access is None:
            return (
                permissions,
                branch_ids,
            )

        if access.role:
            for role_permission in (
                access.role.permissions
            ):
                permission = (
                    role_permission.permission
                )

                if (
                    permission is None
                    or not permission.is_active
                ):
                    continue

                permissions.append(
                    build_permission_key(
                        permission
                    )
                )

        for branch_access in (
            access.branch_accesses
        ):
            branch_ids.append(
                str(
                    branch_access.branch_id
                )
            )

        return (
            permissions,
            branch_ids,
        )

    async def _issue_tokens(
        self,
        *,
        user: User,
        access: UserCompanyAccess | None,
        persist_refresh_token: bool = True,
    ) -> tuple[
        TokenResponse,
        list[str],
        list[str],
    ]:
        permissions, branch_ids = (
            self._access_context(
                access
            )
        )

        company_id = (
            str(
                access.company_id
            )
            if access
            else None
        )

        role_id = (
            str(
                access.role_id
            )
            if access
            else None
        )

        claims = {
            "email": user.email,

            "full_name": (
                user.full_name
            ),

            "is_superuser": (
                user.is_superuser
            ),

            "company_id": (
                company_id
            ),

            "role_id": role_id,

            "permissions": (
                permissions
            ),

            "branch_ids": (
                branch_ids
            ),
        }

        access_token = (
            create_access_token(
                user_id=str(
                    user.id
                ),
                claims=claims,
            )
        )

        refresh_token = (
            create_refresh_token(
                user_id=str(
                    user.id
                ),
                claims={
                    "company_id": (
                        company_id
                    ),
                },
            )
        )

        refresh_payload = (
            decode_token(
                refresh_token
            )
        )

        if persist_refresh_token:
            try:
                await store_refresh_token(
                    refresh_payload
                )

            except Exception as exc:
                logger.exception(
                    "Failed to store "
                    "refresh token in Redis"
                )

                raise HTTPException(
                    status_code=(
                        status
                        .HTTP_503_SERVICE_UNAVAILABLE
                    ),
                    detail=(
                        "Layanan session sedang "
                        "bermasalah. Pastikan Redis "
                        "aktif dan dapat diakses."
                    ),
                ) from exc

        return (
            TokenResponse(
                access_token=(
                    access_token
                ),
                refresh_token=(
                    refresh_token
                ),
            ),
            permissions,
            branch_ids,
        )

    # =========================================================
    # REGISTER COMPANY LIST
    # =========================================================

    async def get_register_companies(
        self,
        *,
        search: str | None = None,
    ) -> list[Company]:
        query = select(Company).where(
            Company.is_active.is_(True),
            Company.status
            == CompanyStatus.ACTIVE,
        )

        if search and search.strip():
            keyword = (
                f"%{search.strip()}%"
            )

            query = query.where(
                or_(
                    Company.name.ilike(
                        keyword
                    ),
                    Company.legal_name.ilike(
                        keyword
                    ),
                    Company.city.ilike(
                        keyword
                    ),
                    Company.province.ilike(
                        keyword
                    ),
                )
            )

        result = await self.db.execute(
            query
            .order_by(
                Company.name.asc()
            )
            .limit(100)
        )

        return list(
            result.scalars().all()
        )

    # =========================================================
    # REGISTER VALIDATION
    # =========================================================

    async def _ensure_email_available(
        self,
        email: str,
    ) -> None:
        normalized_email = (
            self._normalize_email(email)
        )

        result = await self.db.execute(
            select(User.id).where(
                func.lower(User.email)
                == normalized_email
            )
        )

        if (
            result.scalar_one_or_none()
            is not None
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Email sudah terdaftar."
                ),
            )

    async def _ensure_company_name_available(
        self,
        company_name: str,
    ) -> None:
        normalized_name = (
            company_name.strip().lower()
        )

        result = await self.db.execute(
            select(Company.id).where(
                func.lower(
                    func.trim(
                        Company.name
                    )
                )
                == normalized_name
            )
        )

        if (
            result.scalar_one_or_none()
            is not None
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Company dengan nama "
                    "tersebut sudah terdaftar."
                ),
            )

    # =========================================================
    # PERMISSION AND ROLE HELPERS
    # =========================================================

    async def _get_active_permissions(
        self,
    ) -> list[UserPermission]:
        result = await self.db.execute(
            select(UserPermission).where(
                UserPermission.is_active
                .is_(True)
            )
        )

        return list(
            result.scalars().all()
        )

    async def _get_staff_permissions(
        self,
    ) -> list[UserPermission]:
        result = await self.db.execute(
            select(UserPermission).where(
                UserPermission.is_active
                .is_(True),
                UserPermission.action
                == PermissionAction.VIEW,
            )
        )

        permissions = list(
            result.scalars().all()
        )

        if not permissions:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "Permission VIEW belum "
                    "tersedia. Jalankan seed "
                    "permission terlebih dahulu."
                ),
            )

        return permissions

    async def _create_role(
        self,
        *,
        company_id: UUID,
        code: str,
        name: str,
        description: str,
        is_owner_role: bool,
        permissions: list[
            UserPermission
        ],
    ) -> UserRole:
        role = UserRole(
            company_id=company_id,
            code=code,
            name=name,
            description=description,
            is_owner_role=(
                is_owner_role
            ),
            is_system_role=True,
            is_active=True,
        )

        self.db.add(role)

        await self.db.flush()

        for permission in permissions:
            role_permission = (
                UserRolePermission(
                    role_id=role.id,
                    permission_id=(
                        permission.id
                    ),
                )
            )

            self.db.add(
                role_permission
            )

        await self.db.flush()

        return role

    async def _get_or_create_staff_role(
        self,
        company_id: UUID,
    ) -> UserRole:
        result = await self.db.execute(
            select(UserRole).where(
                UserRole.company_id
                == company_id,
                func.lower(UserRole.code)
                == "staff",
                UserRole.is_active
                .is_(True),
            )
        )

        existing_role = (
            result.scalar_one_or_none()
        )

        if existing_role is not None:
            return existing_role

        staff_permissions = (
            await self
            ._get_staff_permissions()
        )

        return await self._create_role(
            company_id=company_id,
            code="staff",
            name="Staff",
            description=(
                "Default role untuk user "
                "yang mendaftar ke company."
            ),
            is_owner_role=False,
            permissions=staff_permissions,
        )

    # =========================================================
    # COMPANY AND BRANCH HELPERS
    # =========================================================

    async def _get_active_company(
        self,
        company_id: UUID,
    ) -> Company:
        result = await self.db.execute(
            select(Company).where(
                Company.id == company_id,
                Company.is_active.is_(True),
                Company.status
                == CompanyStatus.ACTIVE,
            )
        )

        company = (
            result.scalar_one_or_none()
        )

        if company is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "Company tidak ditemukan "
                    "atau sudah tidak aktif."
                ),
            )

        return company

    async def _get_default_branch(
        self,
        company_id: UUID,
    ) -> CompanyBranch:
        result = await self.db.execute(
            select(CompanyBranch)
            .where(
                CompanyBranch.company_id
                == company_id,
                CompanyBranch.is_active
                .is_(True),
            )
            .order_by(
                CompanyBranch
                .is_head_office
                .desc(),
                CompanyBranch
                .created_at
                .asc(),
            )
            .limit(1)
        )

        branch = (
            result.scalar_one_or_none()
        )

        if branch is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Company belum memiliki "
                    "branch aktif."
                ),
            )

        return branch

    # =========================================================
    # REGISTER ENTRY POINT
    # =========================================================

    async def register(
        self,
        payload: RegisterRequest,
    ) -> LoginResponse:
        if (
            payload.account_type
            == "company_owner"
        ):
            return await (
                self
                ._register_company_owner(
                    payload
                )
            )

        if (
            payload.account_type
            == "company_user"
        ):
            return await (
                self
                ._register_company_user(
                    payload
                )
            )

        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Account type tidak valid."
            ),
        )

    # =========================================================
    # REGISTER COMPANY OWNER
    # =========================================================

    async def _register_company_owner(
        self,
        payload: RegisterRequest,
    ) -> LoginResponse:
        email = self._normalize_email(
            payload.email
        )

        company_name = (
            payload.company_name or ""
        ).strip()

        await self._ensure_email_available(
            email
        )

        await self._ensure_company_name_available(
            company_name
        )

        all_permissions = (
            await self
            ._get_active_permissions()
        )

        if not all_permissions:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "Permission catalog belum "
                    "tersedia. Jalankan seed "
                    "permission terlebih dahulu."
                ),
            )

        staff_permissions = [
            permission
            for permission
            in all_permissions
            if (
                permission.action
                == PermissionAction.VIEW
            )
        ]

        if not staff_permissions:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "Permission VIEW untuk role "
                    "Staff belum tersedia."
                ),
            )

        registered_company_id: (
            UUID | None
        ) = None

        try:
            company = Company(
                name=company_name,
                legal_name=(
                    self._clean_optional(
                        payload.legal_name
                    )
                    or company_name
                ),
                email=(
                    self._clean_optional(
                        payload.company_email
                    )
                    or email
                ),
                phone=(
                    self._clean_optional(
                        payload.company_phone
                    )
                ),
                industry=(
                    self._clean_optional(
                        payload.company_industry
                    )
                ),
                company_size=(
                    self._clean_optional(
                        payload.company_size
                    )
                ),
                address_line=(
                    self._clean_optional(
                        payload.address_line
                    )
                ),
                city=(
                    self._clean_optional(
                        payload.city
                    )
                ),
                province=(
                    self._clean_optional(
                        payload.province
                    )
                ),
                country=(
                    payload.country.strip()
                    or "Indonesia"
                ),
                postal_code=(
                    self._clean_optional(
                        payload.postal_code
                    )
                ),
                default_currency="IDR",
                timezone="Asia/Jakarta",
                fiscal_year_start_month=1,
                status=(
                    CompanyStatus.ACTIVE
                ),
                is_active=True,
            )

            self.db.add(company)

            await self.db.flush()

            registered_company_id = (
                company.id
            )

            company_email = company.email
            company_phone = company.phone
            company_address = (
                company.address_line
            )
            company_city = company.city
            company_province = (
                company.province
            )
            company_country = (
                company.country
            )
            company_postal_code = (
                company.postal_code
            )

            head_office = CompanyBranch(
                company_id=(
                    registered_company_id
                ),
                code="HQ",
                name=(
                    f"{company_name} "
                    "Head Office"
                ),
                branch_type=(
                    BranchType.HEAD_OFFICE
                ),
                email=company_email,
                phone=company_phone,
                address_line=(
                    company_address
                ),
                city=company_city,
                province=company_province,
                country=company_country,
                postal_code=(
                    company_postal_code
                ),
                is_head_office=True,
                is_active=True,
            )

            self.db.add(head_office)

            await self.db.flush()

            registered_branch_id = (
                head_office.id
            )

            owner_role = (
                await self._create_role(
                    company_id=(
                        registered_company_id
                    ),
                    code="owner",
                    name="Owner",
                    description=(
                        "Akses penuh sebagai "
                        "pemilik perusahaan."
                    ),
                    is_owner_role=True,
                    permissions=(
                        all_permissions
                    ),
                )
            )

            registered_owner_role_id = (
                owner_role.id
            )

            await self._create_role(
                company_id=(
                    registered_company_id
                ),
                code="admin",
                name="Administrator",
                description=(
                    "Akses administrasi "
                    "operasional ERP."
                ),
                is_owner_role=False,
                permissions=(
                    all_permissions
                ),
            )

            await self._create_role(
                company_id=(
                    registered_company_id
                ),
                code="staff",
                name="Staff",
                description=(
                    "Default role untuk "
                    "user company."
                ),
                is_owner_role=False,
                permissions=(
                    staff_permissions
                ),
            )

            owner = User(
                full_name=(
                    payload.full_name.strip()
                ),
                email=email,
                phone=(
                    self._clean_optional(
                        payload.phone
                    )
                ),
                password_hash=(
                    hash_password(
                        payload.password
                    )
                ),
                status=UserStatus.ACTIVE,
                is_superuser=False,
            )

            self.db.add(owner)

            await self.db.flush()

            registered_owner_id = owner.id

            now = datetime.utcnow()

            owner_access = (
                UserCompanyAccess(
                    user_id=(
                        registered_owner_id
                    ),
                    company_id=(
                        registered_company_id
                    ),
                    role_id=(
                        registered_owner_role_id
                    ),
                    default_branch_id=(
                        registered_branch_id
                    ),
                    access_scope=(
                        AccessScope
                        .ALL_BRANCHES
                    ),
                    job_title="Owner",
                    department_name=(
                        "Management"
                    ),
                    is_owner=True,
                    is_active=True,
                    invited_at=now,
                    joined_at=now,
                )
            )

            self.db.add(owner_access)

            await self.db.flush()

            registered_access_id = (
                owner_access.id
            )

            owner_branch_access = (
                UserBranchAccess(
                    company_access_id=(
                        registered_access_id
                    ),
                    branch_id=(
                        registered_branch_id
                    ),
                    can_manage_branch=True,
                    is_default=True,
                )
            )

            self.db.add(
                owner_branch_access
            )

            await self.db.flush()
            await self.db.commit()

        except HTTPException:
            await self.db.rollback()
            raise

        except IntegrityError as exc:
            await self.db.rollback()

            logger.exception(
                "Register company owner "
                "failed due to integrity error"
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Data register bentrok. "
                    "Email, company, role, atau "
                    "branch kemungkinan sudah ada."
                ),
            ) from exc

        except Exception as exc:
            await self.db.rollback()

            logger.exception(
                "Register company owner failed"
            )

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Registrasi company gagal. "
                    "Periksa log backend."
                ),
            ) from exc

        if registered_company_id is None:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Company ID tidak tersedia "
                    "setelah proses register."
                ),
            )

        return await self._auto_login(
            email=email,
            password=payload.password,
            company_id=(
                registered_company_id
            ),
        )

    # =========================================================
    # REGISTER COMPANY USER
    # =========================================================

    async def _register_company_user(
        self,
        payload: RegisterRequest,
    ) -> LoginResponse:
        if payload.company_id is None:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Company wajib dipilih."
                ),
            )

        email = self._normalize_email(
            payload.email
        )

        await self._ensure_email_available(
            email
        )

        company = (
            await self
            ._get_active_company(
                payload.company_id
            )
        )

        registered_company_id = (
            company.id
        )

        default_branch = (
            await self
            ._get_default_branch(
                registered_company_id
            )
        )

        registered_branch_id = (
            default_branch.id
        )

        try:
            staff_role = (
                await self
                ._get_or_create_staff_role(
                    registered_company_id
                )
            )

            registered_role_id = (
                staff_role.id
            )

            user = User(
                full_name=(
                    payload.full_name.strip()
                ),
                email=email,
                phone=(
                    self._clean_optional(
                        payload.phone
                    )
                ),
                password_hash=(
                    hash_password(
                        payload.password
                    )
                ),
                status=UserStatus.ACTIVE,
                is_superuser=False,
            )

            self.db.add(user)

            await self.db.flush()

            registered_user_id = user.id

            now = datetime.utcnow()

            company_access = (
                UserCompanyAccess(
                    user_id=(
                        registered_user_id
                    ),
                    company_id=(
                        registered_company_id
                    ),
                    role_id=(
                        registered_role_id
                    ),
                    default_branch_id=(
                        registered_branch_id
                    ),
                    access_scope=(
                        AccessScope
                        .SELECTED_BRANCHES
                    ),
                    job_title=(
                        self._clean_optional(
                            payload.job_title
                        )
                    ),
                    department_name=(
                        self._clean_optional(
                            payload
                            .department_name
                        )
                    ),
                    is_owner=False,
                    is_active=True,
                    invited_at=now,
                    joined_at=now,
                )
            )

            self.db.add(company_access)

            await self.db.flush()

            registered_access_id = (
                company_access.id
            )

            branch_access = (
                UserBranchAccess(
                    company_access_id=(
                        registered_access_id
                    ),
                    branch_id=(
                        registered_branch_id
                    ),
                    can_manage_branch=False,
                    is_default=True,
                )
            )

            self.db.add(branch_access)

            await self.db.flush()
            await self.db.commit()

        except HTTPException:
            await self.db.rollback()
            raise

        except IntegrityError as exc:
            await self.db.rollback()

            logger.exception(
                "Register company user "
                "failed due to integrity error"
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Email atau akses company "
                    "sudah terdaftar."
                ),
            ) from exc

        except Exception as exc:
            await self.db.rollback()

            logger.exception(
                "Register company user failed"
            )

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Registrasi user gagal. "
                    "Periksa log backend."
                ),
            ) from exc

        return await self._auto_login(
            email=email,
            password=payload.password,
            company_id=(
                registered_company_id
            ),
        )

    # =========================================================
    # AUTO LOGIN AFTER REGISTER
    # =========================================================

    async def _auto_login(
        self,
        *,
        email: str,
        password: str,
        company_id: UUID,
    ) -> LoginResponse:
        try:
            return await self._login_internal(
                email=email,
                password=password,
                company_id=company_id,
                enforce_rate_limit=False,
            )

        except HTTPException:
            raise

        except Exception as exc:
            logger.exception(
                "Automatic login failed after "
                "successful registration"
            )

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "Registrasi berhasil, tetapi "
                    "session login gagal dibuat. "
                    "Pastikan Redis aktif."
                ),
            ) from exc

    # =========================================================
    # LOGIN
    # =========================================================

    async def login(
        self,
        *,
        email: str,
        password: str,
        company_id: UUID | None = None,
    ) -> LoginResponse:
        return await self._login_internal(
            email=email,
            password=password,
            company_id=company_id,
            enforce_rate_limit=True,
        )

    async def _login_internal(
        self,
        *,
        email: str,
        password: str,
        company_id: UUID | None,
        enforce_rate_limit: bool,
    ) -> LoginResponse:
        normalized_email = (
            self._normalize_email(email)
        )

        if enforce_rate_limit:
            await check_login_rate_limit(
                normalized_email
            )

        user = await self._get_user_by_email(
            normalized_email
        )

        if (
            user is None
            or not verify_password(
                password,
                user.password_hash,
            )
        ):
            if enforce_rate_limit:
                await increase_login_attempt(
                    normalized_email
                )

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid email or password"
                ),
            )

        if (
            user.status
            != UserStatus.ACTIVE
        ):
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_403_FORBIDDEN
                ),
                detail=(
                    "User account is not active"
                ),
            )

        active_accesses = [
            access
            for access
            in user.company_accesses
            if access.is_active
        ]

        selected_access: (
            UserCompanyAccess | None
        ) = None

        if company_id is not None:
            selected_access = next(
                (
                    access
                    for access
                    in active_accesses
                    if (
                        access.company_id
                        == company_id
                    )
                ),
                None,
            )

            if (
                selected_access is None
                and not user.is_superuser
            ):
                raise HTTPException(
                    status_code=(
                        status
                        .HTTP_403_FORBIDDEN
                    ),
                    detail=(
                        "User has no access "
                        "to this company"
                    ),
                )

        elif active_accesses:
            selected_access = (
                active_accesses[0]
            )

        response_user_id = user.id
        response_full_name = (
            user.full_name
        )
        response_email = user.email
        response_is_superuser = (
            user.is_superuser
        )

        response_company_id = (
            selected_access.company_id
            if selected_access
            else None
        )

        response_role_id = (
            selected_access.role_id
            if selected_access
            else None
        )

        (
            token,
            permissions,
            branch_ids,
        ) = await self._issue_tokens(
            user=user,
            access=selected_access,
        )

        user.last_login_at = (
            datetime.utcnow()
        )

        try:
            await self.db.commit()

        except Exception as exc:
            await self.db.rollback()

            logger.exception(
                "Failed to update last login"
            )

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Login gagal menyimpan "
                    "informasi session."
                ),
            ) from exc

        if enforce_rate_limit:
            try:
                await reset_login_attempt(
                    normalized_email
                )

            except Exception:
                logger.exception(
                    "Failed to reset login "
                    "rate limit"
                )

        return LoginResponse(
            user=AuthUserResponse(
                id=response_user_id,
                full_name=(
                    response_full_name
                ),
                email=response_email,
                is_superuser=(
                    response_is_superuser
                ),
                company_id=(
                    response_company_id
                ),
                role_id=response_role_id,
                permissions=permissions,
                branch_ids=branch_ids,
            ),
            token=token,
        )

    # =========================================================
    # REFRESH TOKEN
    # =========================================================

async def refresh(
    self,
    refresh_token: str,
) -> TokenResponse:
    try:
        payload = decode_token(
            refresh_token
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid refresh token"
            ),
        ) from exc

    if (
        payload.get("type")
        != "refresh"
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid token type"
            ),
        )

    old_jti = payload.get(
        "jti"
    )

    if not old_jti:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Refresh token JTI "
                "tidak tersedia."
            ),
        )

    user_id = payload.get(
        "sub"
    )

    if not user_id:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid token subject"
            ),
        )

    try:
        parsed_user_id = UUID(
            str(user_id)
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid token subject"
            ),
        ) from exc

    user = await self.get_user_by_id(
        parsed_user_id
    )

    if user is None:
        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail="User not found",
        )

    if (
        user.status
        != UserStatus.ACTIVE
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_403_FORBIDDEN
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
                    status
                    .HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Invalid company context"
                ),
            ) from exc

        selected_access = (
            await self
            ._get_company_access(
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
                    status
                    .HTTP_403_FORBIDDEN
                ),
                detail=(
                    "User has no active "
                    "access to this company"
                ),
            )

    token, _, _ = (
        await self._issue_tokens(
            user=user,
            access=selected_access,
            persist_refresh_token=False,
        )
    )

    if not token.refresh_token:
        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Refresh session baru "
                "gagal dibuat."
            ),
        )

    new_refresh_payload = (
        decode_token(
            token.refresh_token
        )
    )

    try:
        was_rotated = (
            await rotate_refresh_token(
                old_jti=str(
                    old_jti
                ),
                new_payload=(
                    new_refresh_payload
                ),
            )
        )

    except Exception as exc:
        logger.exception(
            "Failed to rotate "
            "refresh token in Redis"
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
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Refresh token revoked, "
                "expired, or already used"
            ),
        )

    return token