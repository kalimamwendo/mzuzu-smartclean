from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User
from app.schemas.auth import UserOut, UserPage, UserRoleUpdate
from app.security.auth import require_admin

router = APIRouter(prefix="/admin/users", tags=["admin users"])


@router.get("", response_model=UserPage)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    total = db.scalar(select(func.count()).select_from(User)) or 0
    users = db.scalars(
        select(User).order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return UserPage(items=users, total=total, page=page, page_size=page_size)


@router.patch("/{user_id}/role", response_model=UserOut)
def change_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User was not found.")

    if user.id == current_admin.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own administrator role.")
    if user.role == "admin" and payload.role != "admin":
        admin_count = db.scalar(select(func.count()).select_from(User).where(User.role == "admin")) or 0
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="The last administrator cannot be demoted.")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user
