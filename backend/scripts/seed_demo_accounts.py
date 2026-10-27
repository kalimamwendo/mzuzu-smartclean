"""Create temporary local demo accounts when explicitly enabled in .env."""
from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import User
from app.models.enums import AccountStatus, UserRole
from app.security.auth import hash_password

ACCOUNTS = [
    {
        "display_name": "SmartClean Demo Citizen",
        "email": "citizen@smartclean.mw",
        "password": "CleanCity2026!",
        "role": UserRole.CITIZEN,
    },
    {
        "display_name": "SmartClean Demo Administrator",
        "email": "admin@smartclean.mw",
        "password": "SmartCleanDemo26!",
        "role": UserRole.ADMIN,
    },
]


def seed_default_accounts() -> int:
    if not settings.seed_default_accounts:
        raise RuntimeError("Set SEED_DEFAULT_ACCOUNTS=true to seed development-only accounts.")
    if SessionLocal is None:
        raise RuntimeError("Database is not configured. Configure DATABASE_URL and install its driver.")

    created = 0
    with SessionLocal.begin() as db:
        for account in ACCOUNTS:
            existing = db.scalar(select(User).where(User.email == account["email"]))
            if existing:
                continue
            db.add(User(
                display_name=account["display_name"],
                email=account["email"],
                password_hash=hash_password(account["password"]),
                role=account["role"],
                account_status=AccountStatus.ACTIVE,
            ))
            created += 1
    return created


if __name__ == "__main__":
    print(f"Created {seed_default_accounts()} default development accounts; existing accounts unchanged.")
