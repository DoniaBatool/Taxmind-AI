"""
TaxMind AI — Configuration
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
import os

ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Database (Neon DB)
    database_url: str = ""

    # App
    app_env: str = "development"
    app_secret_key: str = "dev-secret-key-change-in-production"
    upload_dir: str = "./uploads"

    # Cloudflare R2 Object Storage
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "taxmind-documents"

    # CORS — comma-separated origins, e.g. "https://taxmind.onrender.com,http://localhost:3000"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
