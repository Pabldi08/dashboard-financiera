import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_host: str
    app_port: int
    app_admin_user: str
    app_admin_password: str
    app_secret_key: str
    integration_api_key: str
    telegram_bot_token: str
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str


def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "dashboard financiera"),
        app_host=os.getenv("APP_HOST", "127.0.0.1"),
        app_port=int(os.getenv("APP_PORT", "8000")),
        app_admin_user=os.getenv("APP_ADMIN_USER", "admin"),
        app_admin_password=os.getenv("APP_ADMIN_PASSWORD", "admin"),
        app_secret_key=os.getenv("APP_SECRET_KEY", "change-this-secret"),
        integration_api_key=os.getenv("INTEGRATION_API_KEY", "change-this-api-key"),
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        db_host=os.getenv("DB_HOST", "127.0.0.1"),
        db_port=int(os.getenv("DB_PORT", "3306")),
        db_name=os.getenv("DB_NAME", "finanzas"),
        db_user=os.getenv("DB_USER", "gastos_readonly"),
        db_password=os.getenv("DB_PASSWORD", ""),
    )
