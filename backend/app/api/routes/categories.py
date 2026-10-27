from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import WasteCategory
from app.schemas.reports import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(
        select(WasteCategory).where(WasteCategory.is_active.is_(True)).order_by(WasteCategory.name)
    ).all()
