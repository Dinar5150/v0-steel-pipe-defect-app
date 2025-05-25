from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)


class ImageRecord(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    original_object = Column(String)  # путь к оригиналу в MinIO
    mask_text = Column(Text)  # текст полигона (predictions_txt)
    report_object = Column(String)  # путь к report.csv в MinIO
    created_at = Column(DateTime(timezone=True), server_default=func.now())
