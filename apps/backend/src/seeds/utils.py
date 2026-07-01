from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Iterable

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession


SEED_NAMESPACE = uuid.UUID("4d1f6d7e-2f5a-4df0-9b14-1df32f8cc001")


def sid(key: str) -> uuid.UUID:
    # """
    # Stable UUID untuk seed.

    # Keuntungan:
    # - tetap UUID valid;
    # - relasi antar tabel stabil;
    # - aman rerun seed;
    # - tidak bergantung pada id integer.
    # """
    return uuid.uuid5(SEED_NAMESPACE, key)


def D(value: str | int | float) -> Decimal:
    return Decimal(str(value))


def seed_password_hash(password: str = "admin123") -> str:
    # """
    # Hash password khusus seed.

    # Tidak memakai passlib karena di environment kamu passlib + bcrypt
    # sedang error saat hash password.
    # """
    raw = password.encode("utf-8")

    if len(raw) > 72:
        raise ValueError("Password bcrypt tidak boleh lebih dari 72 bytes.")

    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=12)).decode("utf-8")


async def add_if_missing(db: AsyncSession, instance):
    existing = await db.get(type(instance), instance.id)

    if existing is not None:
        return existing, False

    db.add(instance)
    return instance, True


async def add_many_if_missing(db: AsyncSession, instances: Iterable):
    created = 0

    for instance in instances:
        _, is_created = await add_if_missing(db, instance)
        created += int(is_created)

    return created