"""
app/config.py — application settings loaded exclusively from environment variables.
Never hardcode secrets here.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database — must be set in environment or .env file
    DATABASE_URL: str

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:3000"

    # Application environment (development | production)
    ENV: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()  # type: ignore[call-arg]
