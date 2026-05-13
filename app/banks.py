from typing import Any

from app.database import execute, execute_returning_id, fetch_all, fetch_one
from app.models import BankPayload


def list_banks(include_inactive: bool = False) -> list[dict[str, Any]]:
    where_sql = "" if include_inactive else "WHERE is_active = TRUE"
    return fetch_all(
        f"""
        SELECT id, name, logo_url, is_active, created_at, updated_at
        FROM banks
        {where_sql}
        ORDER BY name ASC
        """
    )


def get_bank(bank_id: int) -> dict[str, Any]:
    row = fetch_one(
        """
        SELECT id, name, logo_url, is_active, created_at, updated_at
        FROM banks
        WHERE id = %s
        """,
        (bank_id,),
    )
    if row is None:
        raise ValueError("Banco no encontrado")
    return row


def create_bank(payload: BankPayload) -> dict[str, Any]:
    bank_id = execute_returning_id(
        """
        INSERT INTO banks (name, logo_url, is_active)
        VALUES (%s, %s, %s)
        """,
        (payload.name.strip(), payload.logo_url, payload.is_active),
    )
    return get_bank(bank_id)


def update_bank(bank_id: int, payload: BankPayload) -> dict[str, Any]:
    count = execute(
        """
        UPDATE banks
        SET name = %s, logo_url = %s, is_active = %s
        WHERE id = %s
        """,
        (payload.name.strip(), payload.logo_url, payload.is_active, bank_id),
    )
    if count == 0:
        raise ValueError("Banco no encontrado")
    return get_bank(bank_id)


def delete_bank(bank_id: int) -> dict[str, bool]:
    count = execute("UPDATE banks SET is_active = FALSE WHERE id = %s", (bank_id,))
    if count == 0:
        raise ValueError("Banco no encontrado")
    return {"deleted": True}
