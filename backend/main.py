# main.py
import io
from uuid import uuid4

from auth import authenticate_user, create_access_token, get_current_user
from config import settings
from crud import (
    create_image_record,
    create_user,
    get_images_by_user,
    get_user_by_username,
)
from database import async_session, engine
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from minio import Minio
from models import Base
from schemas import ImageRead, Token, UserCreate, UserRead
from segmentation_service import predict_masks_and_report

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MinIO client
minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)
if not minio_client.bucket_exists(settings.MINIO_BUCKET):
    minio_client.make_bucket(settings.MINIO_BUCKET)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.post("/register", response_model=UserRead)
async def register(user: UserCreate):
    async with async_session() as session:
        if await get_user_by_username(session, user.username):
            raise HTTPException(status_code=400, detail="Username already registered")
        return await create_user(session, user)


@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/segment", response_model=ImageRead)
async def segment_image(
    file: UploadFile = File(...), current_user=Depends(get_current_user)
):
    # unique id per request
    uid = uuid4().hex
    ext = file.filename.split(".")[-1]

    # read bytes
    data = await file.read()

    # store original image
    orig_obj = f"{current_user.id}/{uid}.{ext}"
    minio_client.put_object(
        settings.MINIO_BUCKET,
        orig_obj,
        io.BytesIO(data),
        length=len(data),
        content_type=file.content_type,
    )

    # inference: get mask text and CSV report
    predictions_txt, report_csv = predict_masks_and_report(data)

    # store report.csv
    csv_obj = f"{current_user.id}/{uid}_report.csv"
    minio_client.put_object(
        settings.MINIO_BUCKET,
        csv_obj,
        io.BytesIO(report_csv.encode("utf-8")),
        length=len(report_csv.encode("utf-8")),
        content_type="text/csv",
    )

    # save record in DB: original_object, mask_text, report_object
    async with async_session() as session:
        record = await create_image_record(
            session, current_user.id, orig_obj, predictions_txt, csv_obj
        )

    # generate presigned URLs
    original_url = minio_client.presigned_get_object(settings.MINIO_BUCKET, orig_obj)
    report_url = minio_client.presigned_get_object(settings.MINIO_BUCKET, csv_obj)

    return ImageRead(
        id=record.id,
        original_url=original_url,
        mask_text=record.mask_text,
        report_url=report_url,
        created_at=record.created_at,
    )


@app.get("/images", response_model=list[ImageRead])
async def list_images(current_user=Depends(get_current_user)):
    async with async_session() as session:
        records = await get_images_by_user(session, current_user.id)
    result = []
    for r in records:
        original_url = minio_client.presigned_get_object(
            settings.MINIO_BUCKET, r.original_object
        )
        report_url = minio_client.presigned_get_object(
            settings.MINIO_BUCKET, r.report_object
        )
        result.append(
            ImageRead(
                id=r.id,
                original_url=original_url,
                mask_text=r.mask_text,
                report_url=report_url,
                created_at=r.created_at,
            )
        )
    return result
