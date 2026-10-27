from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import WasteCategory

CATEGORIES = [
    ("Full dustbin or overflowing collection point", "A public or household collection point that is full or overflowing."),
    ("Indiscriminate waste disposal", "Waste dumped in an unauthorized or unmanaged location."),
    ("Waste disposal where no dustbin is available", "Waste placed in a public area because no bin or collection point is available."),
]


def seed_categories() -> int:
    inserted = 0
    with SessionLocal.begin() as db:
        existing_names = set(db.scalars(select(WasteCategory.name)).all())
        for name, description in CATEGORIES:
            if name not in existing_names:
                db.add(WasteCategory(name=name, description=description, is_active=True))
                inserted += 1
    return inserted


if __name__ == "__main__":
    count = seed_categories()
    print(f"Inserted {count} waste categories; existing categories were preserved.")
