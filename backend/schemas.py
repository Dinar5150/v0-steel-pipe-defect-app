from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class ImageRead(BaseModel):
    id: int
    original_url: str
    mask_text: str
    report_url: str
    created_at: datetime

    class Config:
        orm_mode = True
