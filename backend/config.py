from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # MinIO SDK-конфиг
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_SECURE: bool = False
    MINIO_BUCKET: str = "uploads"

    # говорим Pydantic: подгрузи .env и игнорируй все лишние переменные
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
