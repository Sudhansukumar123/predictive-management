import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ─── App Meta ────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "Predictive Maintenance Agent API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # development | production
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    # ─── Security ────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "super-secret-key-change-in-production-please"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))
    )  # 1 day default

    # ─── CORS ────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins e.g.
    # "https://your-app.vercel.app,http://localhost:3000"
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ─── Database ────────────────────────────────────────────────────────────
    # Railway injects DATABASE_URL automatically for PostgreSQL add-ons.
    # Falls back to local SQLite for development.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./maintenance.db")

    # ─── ML / Simulator ──────────────────────────────────────────────────────
    SIMULATOR_INTERVAL_SECONDS: float = float(
        os.getenv("SIMULATOR_INTERVAL_SECONDS", "2.0")
    )

    # ─── Optional LLM ────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        case_sensitive = True
        # Load .env file if present (local dev)
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
