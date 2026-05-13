from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


MovementType = Literal["gasto", "ingreso"]


class LoginRequest(BaseModel):
    username: str
    password: str


class MovementPayload(BaseModel):
    tipo: MovementType
    cantidad: Decimal = Field(gt=0)
    moneda: str = "EUR"
    categoria: str | None = None
    subcategoria: str | None = None
    concepto: str | None = None
    metodo_pago: str | None = None
    cuenta: str | None = None
    nota: str | None = None
    created_at: datetime | None = None
    pendiente_id: str | None = None
    telegram_user_id: int | None = None
    chat_id: int | None = None


class ImportCommitRequest(BaseModel):
    rows: list[MovementPayload]
    filename: str = "importacion"


class BankPayload(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    logo_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True
