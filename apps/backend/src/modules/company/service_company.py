from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.company.model_company import (
    BranchType,
    Company,
    CompanyBranch,
)
from src.modules.company.schema_company import (
    CompanyBranchCreate,
    CompanyBranchUpdate,
    CompanyCreate,
    CompanyProvisionCreate,
    CompanyUpdate,
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
from src.security.authentication.hash import hash_password


class CompanyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================
    # INTERNAL HELPERS
    # =========================================================

    @staticmethod
    def _normalize_email(value: str) -> str:
        return value.strip().lower()

    @staticmethod
    def _build_company_detail(company: Company) -> dict:
        """
        Mengubah model Company beserta relasinya menjadi bentuk
        yang sesuai dengan CompanyDetailResponse.

        Service mengembalikan dict agar route dapat langsung
        divalidasi oleh response_model Pydantic.
        """

        branches = sorted(
            list(company.branches),
            key=lambda branch: (
                not branch.is_head_office,
                branch.name.lower(),
            ),
        )

        accesses = sorted(
            [
                access
                for access in company.user_accesses
                if access.user is not None
                and access.role is not None
            ],
            key=lambda access: (
                not access.is_owner,
                access.user.full_name.lower(),
            ),
        )

        users = [
            {
                "id": access.user.id,
                "full_name": access.user.full_name,
                "email": access.user.email,
                "phone": access.user.phone,
                "role_code": access.role.code,
                "role_name": access.role.name,
                "job_title": access.job_title,
                "department_name": access.department_name,
                "is_owner": access.is_owner,
                "is_active": access.is_active,
                "last_login_at": access.user.last_login_at,
                "created_at": access.user.created_at,
            }
            for access in accesses
        ]

        return {
            "company": company,
            "branches": branches,
            "users": users,
            "branches_count": len(branches),
            "users_count": len(users),
        }

    async def _email_exists(self, email: str) -> bool:
        result = await self.db.execute(
            select(User.id).where(
                User.email == self._normalize_email(email)
            )
        )

        return result.scalar_one_or_none() is not None

    async def _tax_number_exists(
        self,
        tax_number: str,
        *,
        exclude_company_id: UUID | None = None,
    ) -> bool:
        query = select(Company.id).where(
            Company.tax_number == tax_number
        )

        if exclude_company_id is not None:
            query = query.where(
                Company.id != exclude_company_id
            )

        result = await self.db.execute(query)

        return result.scalar_one_or_none() is not None

    async def _get_active_permissions(
        self,
    ) -> list[UserPermission]:
        result = await self.db.execute(
            select(UserPermission)
            .where(
                UserPermission.is_active.is_(True)
            )
            .order_by(
                UserPermission.module_code.asc(),
                UserPermission.feature_code.asc(),
                UserPermission.action.asc(),
            )
        )

        return list(result.scalars().all())

    # =========================================================
    # COMPANY STANDARD CRUD
    # =========================================================

    async def create_company(
        self,
        payload: CompanyCreate,
    ):
        if (
            payload.tax_number
            and await self._tax_number_exists(
                payload.tax_number
            )
        ):
            raise ValueError(
                "Tax number / NPWP already used"
            )

        company = Company(
            **payload.model_dump()
        )

        try:
            self.db.add(company)
            await self.db.commit()
            await self.db.refresh(company)

            return company

        except IntegrityError as exc:
            await self.db.rollback()

            raise ValueError(
                "Company data conflicts with existing data"
            ) from exc

        except Exception:
            await self.db.rollback()
            raise

    async def get_companies(self):
        result = await self.db.execute(
            select(Company).order_by(
                Company.created_at.desc()
            )
        )

        return list(result.scalars().all())

    async def get_company_by_id(
        self,
        company_id: UUID,
    ):
        result = await self.db.execute(
            select(Company).where(
                Company.id == company_id
            )
        )

        return result.scalar_one_or_none()

    async def get_company_detail(
        self,
        company_id: UUID,
    ):
        """
        Mengambil company sekaligus:

        - branches;
        - company accesses;
        - user dari setiap access;
        - role dari setiap access;
        - branch access.

        selectinload bertingkat penting supaya tidak memicu
        MissingGreenlet ketika response mencoba membaca user/role.
        """

        result = await self.db.execute(
            select(Company)
            .where(
                Company.id == company_id
            )
            .options(
                selectinload(
                    Company.branches
                ),
                selectinload(
                    Company.user_accesses
                ).selectinload(
                    UserCompanyAccess.user
                ),
                selectinload(
                    Company.user_accesses
                ).selectinload(
                    UserCompanyAccess.role
                ),
                selectinload(
                    Company.user_accesses
                ).selectinload(
                    UserCompanyAccess.branch_accesses
                ),
            )
        )

        company = result.scalar_one_or_none()

        if company is None:
            return None

        return self._build_company_detail(
            company
        )

    async def update_company(
        self,
        company_id: UUID,
        payload: CompanyUpdate,
    ):
        company = await self.get_company_by_id(
            company_id
        )

        if company is None:
            return None

        data = payload.model_dump(
            exclude_unset=True
        )

        tax_number = data.get("tax_number")

        if (
            tax_number
            and await self._tax_number_exists(
                tax_number,
                exclude_company_id=company_id,
            )
        ):
            raise ValueError(
                "Tax number / NPWP already used"
            )

        for field, value in data.items():
            setattr(company, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(company)

            return company

        except IntegrityError as exc:
            await self.db.rollback()

            raise ValueError(
                "Company data conflicts with existing data"
            ) from exc

        except Exception:
            await self.db.rollback()
            raise

    async def delete_company(
        self,
        company_id: UUID,
    ) -> bool:
        company = await self.get_company_by_id(
            company_id
        )

        if company is None:
            return False

        try:
            await self.db.delete(company)
            await self.db.commit()

            return True

        except Exception:
            await self.db.rollback()
            raise

    # =========================================================
    # SUPERADMIN COMPANY PROVISIONING
    # =========================================================

    async def provision_company(
        self,
        payload: CompanyProvisionCreate,
    ):
        """
        Membuat seluruh data tenant dalam satu transaksi:

        1. Company
        2. Head office
        3. Role Owner
        4. Role Admin
        5. Role Staff
        6. Permission role
        7. Akun owner
        8. Akses company owner
        9. Akses branch owner
        10. User tambahan beserta aksesnya

        Jika satu proses gagal, semua perubahan di-rollback.
        """

        owner_email = self._normalize_email(
            payload.owner.email
        )

        additional_emails = [
            self._normalize_email(user.email)
            for user in payload.users
        ]

        all_emails = [
            owner_email,
            *additional_emails,
        ]

        if len(all_emails) != len(
            set(all_emails)
        ):
            raise ValueError(
                "There are duplicate emails in the submitted users"
            )

        existing_email_result = (
            await self.db.execute(
                select(User.email).where(
                    User.email.in_(all_emails)
                )
            )
        )

        existing_emails = list(
            existing_email_result.scalars().all()
        )

        if existing_emails:
            raise ValueError(
                "Email already registered: "
                + ", ".join(
                    sorted(existing_emails)
                )
            )

        if (
            payload.company.tax_number
            and await self._tax_number_exists(
                payload.company.tax_number
            )
        ):
            raise ValueError(
                "Tax number / NPWP already used"
            )

        active_permissions = (
            await self._get_active_permissions()
        )

        if not active_permissions:
            raise ValueError(
                "Permission master is empty. "
                "Run the permission seed first."
            )

        now = datetime.utcnow()

        try:
            # =================================================
            # COMPANY
            # =================================================

            company = Company(
                **payload.company.model_dump()
            )

            self.db.add(company)
            await self.db.flush()

            # =================================================
            # HEAD OFFICE
            # =================================================

            head_office = CompanyBranch(
                company_id=company.id,
                code="HQ",
                name=f"{company.name} Head Office",
                branch_type=(
                    BranchType.HEAD_OFFICE
                ),
                email=company.email,
                phone=company.phone,
                address_line=(
                    company.address_line
                ),
                city=company.city,
                province=company.province,
                country=company.country,
                postal_code=(
                    company.postal_code
                ),
                is_head_office=True,
                is_active=True,
            )

            self.db.add(head_office)
            await self.db.flush()

            # =================================================
            # ADDITIONAL BRANCHES
            # =================================================

            used_branch_codes = {
                "HQ",
            }

            additional_branches: list[
                CompanyBranch
            ] = []

            for branch_payload in payload.branches:
                branch_code = (
                    branch_payload.code
                    .strip()
                    .upper()
                )

                if branch_code in used_branch_codes:
                    raise ValueError(
                        f"Duplicate branch code: {branch_code}"
                    )

                used_branch_codes.add(
                    branch_code
                )

                branch = CompanyBranch(
                    company_id=company.id,
                    code=branch_code,
                    name=(
                        branch_payload.name
                        .strip()
                    ),
                    branch_type=(
                        branch_payload.branch_type
                    ),
                    email=branch_payload.email,
                    phone=branch_payload.phone,
                    address_line=(
                        branch_payload.address_line
                    ),
                    city=branch_payload.city,
                    province=(
                        branch_payload.province
                    ),
                    country=(
                        branch_payload.country
                    ),
                    postal_code=(
                        branch_payload.postal_code
                    ),
                    is_head_office=False,
                    is_active=(
                        branch_payload.is_active
                    ),
                )

                self.db.add(branch)

                additional_branches.append(
                    branch
                )

            await self.db.flush()

            # =================================================
            # COMPANY ROLES
            # =================================================

            owner_role = UserRole(
                company_id=company.id,
                code="owner",
                name="Owner",
                description=(
                    "Full access as company owner"
                ),
                is_owner_role=True,
                is_system_role=True,
                is_active=True,
            )

            admin_role = UserRole(
                company_id=company.id,
                code="admin",
                name="Administrator",
                description=(
                    "Full operational access"
                ),
                is_owner_role=False,
                is_system_role=True,
                is_active=True,
            )

            staff_role = UserRole(
                company_id=company.id,
                code="staff",
                name="Staff",
                description=(
                    "Basic company access"
                ),
                is_owner_role=False,
                is_system_role=True,
                is_active=True,
            )

            roles = {
                "owner": owner_role,
                "admin": admin_role,
                "staff": staff_role,
            }

            self.db.add_all(
                list(roles.values())
            )

            await self.db.flush()

            # =================================================
            # ROLE PERMISSIONS
            # =================================================

            role_permissions: list[
                UserRolePermission
            ] = []

            for permission in active_permissions:
                # Owner mendapat seluruh permission.
                role_permissions.append(
                    UserRolePermission(
                        role_id=owner_role.id,
                        permission_id=(
                            permission.id
                        ),
                    )
                )

                # Admin mendapat seluruh permission.
                role_permissions.append(
                    UserRolePermission(
                        role_id=admin_role.id,
                        permission_id=(
                            permission.id
                        ),
                    )
                )

                # Staff hanya mendapat permission view.
                if (
                    permission.action
                    == PermissionAction.VIEW
                ):
                    role_permissions.append(
                        UserRolePermission(
                            role_id=staff_role.id,
                            permission_id=(
                                permission.id
                            ),
                        )
                    )

            self.db.add_all(
                role_permissions
            )

            # =================================================
            # OWNER USER
            # =================================================

            owner_user = User(
                full_name=(
                    payload.owner.full_name
                    .strip()
                ),
                email=owner_email,
                phone=payload.owner.phone,
                password_hash=hash_password(
                    payload.owner.password
                ),
                avatar_url=getattr(
                    payload.owner,
                    "avatar_url",
                    None,
                ),
                status=UserStatus.ACTIVE,
                is_superuser=False,
            )

            self.db.add(owner_user)
            await self.db.flush()

            owner_access = UserCompanyAccess(
                user_id=owner_user.id,
                company_id=company.id,
                role_id=owner_role.id,
                default_branch_id=(
                    head_office.id
                ),
                access_scope=(
                    AccessScope.ALL_BRANCHES
                ),
                job_title=(
                    payload.owner.job_title
                ),
                department_name=(
                    payload.owner
                    .department_name
                ),
                is_owner=True,
                is_active=True,
                invited_at=now,
                joined_at=now,
            )

            self.db.add(owner_access)
            await self.db.flush()

            owner_branch_access = (
                UserBranchAccess(
                    company_access_id=(
                        owner_access.id
                    ),
                    branch_id=head_office.id,
                    can_manage_branch=True,
                    is_default=True,
                )
            )

            self.db.add(
                owner_branch_access
            )

            # =================================================
            # ADDITIONAL USERS
            # =================================================

            for member in payload.users:
                member_email = (
                    self._normalize_email(
                        member.email
                    )
                )

                role = roles.get(
                    member.role_code
                )

                if role is None:
                    raise ValueError(
                        "Unsupported role code: "
                        f"{member.role_code}"
                    )

                user = User(
                    full_name=(
                        member.full_name.strip()
                    ),
                    email=member_email,
                    phone=member.phone,
                    password_hash=hash_password(
                        member.password
                    ),
                    avatar_url=getattr(
                        member,
                        "avatar_url",
                        None,
                    ),
                    status=UserStatus.ACTIVE,
                    is_superuser=False,
                )

                self.db.add(user)
                await self.db.flush()

                if (
                    member.role_code
                    == "admin"
                ):
                    access_scope = (
                        AccessScope.ALL_BRANCHES
                    )
                    can_manage_branch = True
                else:
                    access_scope = (
                        AccessScope.COMPANY
                    )
                    can_manage_branch = False

                company_access = (
                    UserCompanyAccess(
                        user_id=user.id,
                        company_id=company.id,
                        role_id=role.id,
                        default_branch_id=(
                            head_office.id
                        ),
                        access_scope=(
                            access_scope
                        ),
                        job_title=(
                            member.job_title
                        ),
                        department_name=(
                            member
                            .department_name
                        ),
                        is_owner=False,
                        is_active=True,
                        invited_at=now,
                        joined_at=now,
                    )
                )

                self.db.add(
                    company_access
                )

                await self.db.flush()

                branch_access = (
                    UserBranchAccess(
                        company_access_id=(
                            company_access.id
                        ),
                        branch_id=(
                            head_office.id
                        ),
                        can_manage_branch=(
                            can_manage_branch
                        ),
                        is_default=True,
                    )
                )

                self.db.add(
                    branch_access
                )

            # Satu commit untuk seluruh provisioning.
            await self.db.commit()

        except ValueError:
            await self.db.rollback()
            raise

        except IntegrityError as exc:
            await self.db.rollback()

            raise ValueError(
                "Company, role, branch, or user "
                "conflicts with existing data"
            ) from exc

        except Exception:
            await self.db.rollback()
            raise

        # Fetch ulang dengan semua relation yang dibutuhkan.
        return await self.get_company_detail(
            company.id
        )

    # =========================================================
    # BRANCH CRUD
    # =========================================================

    async def create_branch(
        self,
        company_id: UUID,
        payload: CompanyBranchCreate,
    ):
        branch = CompanyBranch(
            company_id=company_id,
            **payload.model_dump(),
        )

        try:
            self.db.add(branch)
            await self.db.commit()
            await self.db.refresh(branch)

            return branch

        except IntegrityError as exc:
            await self.db.rollback()

            raise ValueError(
                "Branch code already exists "
                "in this company"
            ) from exc

        except Exception:
            await self.db.rollback()
            raise

    async def get_branches(
        self,
        company_id: UUID,
    ):
        result = await self.db.execute(
            select(CompanyBranch)
            .where(
                CompanyBranch.company_id
                == company_id
            )
            .order_by(
                CompanyBranch
                .created_at
                .desc()
            )
        )

        return list(result.scalars().all())

    async def get_branch_by_id(
        self,
        branch_id: UUID,
    ):
        result = await self.db.execute(
            select(CompanyBranch).where(
                CompanyBranch.id
                == branch_id
            )
        )

        return result.scalar_one_or_none()

    async def update_branch(
        self,
        branch_id: UUID,
        payload: CompanyBranchUpdate,
    ):
        branch = await self.get_branch_by_id(
            branch_id
        )

        if branch is None:
            return None

        data = payload.model_dump(
            exclude_unset=True
        )

        for field, value in data.items():
            setattr(branch, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(branch)

            return branch

        except IntegrityError as exc:
            await self.db.rollback()

            raise ValueError(
                "Branch code already exists "
                "in this company"
            ) from exc

        except Exception:
            await self.db.rollback()
            raise

    async def delete_branch(
        self,
        branch_id: UUID,
    ) -> bool:
        branch = await self.get_branch_by_id(
            branch_id
        )

        if branch is None:
            return False

        try:
            await self.db.delete(branch)
            await self.db.commit()

            return True

        except Exception:
            await self.db.rollback()
            raise