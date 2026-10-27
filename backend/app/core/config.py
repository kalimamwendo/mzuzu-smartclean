from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Mzuzu SmartClean API"
    app_env: str = "development"
    database_url: str = "sqlite:///./smartclean.db"
    cors_origins: list[str] = ["http://localhost:5173"]
    secret_key: str = Field(default="development-only-change-this-secret-before-use", min_length=32)
    access_token_minutes: int = 60
    seed_default_accounts: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
