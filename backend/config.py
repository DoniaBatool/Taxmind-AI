"""
TaxMind AI — Configuration
Gemini API + Neon DB settings
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"

    # Database (Neon DB)
    database_url: str = ""

    # App
    app_env: str = "development"
    app_secret_key: str = "dev-secret-key"
    upload_dir: str = "./uploads"

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
