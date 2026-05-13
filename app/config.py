import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_host: str
    app_port: int
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
        db_host=os.getenv("DB_HOST", "127.0.0.1"),
        db_port=int(os.getenv("DB_PORT", "3306")),
        db_name=os.getenv("DB_NAME", "finanzas"),
        db_user=os.getenv("DB_USER", "gastos_readonly"),
        db_password=os.getenv("DB_PASSWORD", ""),
    )

