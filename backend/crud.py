from models import ImageRecord, User
from schemas import UserCreate
from security import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


async def create_user(db: AsyncSession, user: UserCreate):
    hashed = get_password_hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(User).where(User.username == username))
    return result.scalars().first()


async def create_image_record(
    db: AsyncSession, user_id: int, orig_obj: str, mask_text: str, report_obj: str
) -> ImageRecord:
    record = ImageRecord(
        user_id=user_id,
        original_object=orig_obj,
        mask_text=mask_text,
        report_object=report_obj,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_images_by_user(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(ImageRecord)
        .where(ImageRecord.user_id == user_id)
        .order_by(ImageRecord.created_at.desc())
    )
    return result.scalars().all()
