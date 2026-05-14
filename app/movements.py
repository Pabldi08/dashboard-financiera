from typing import Any

from app.database import execute, execute_returning_id, fetch_one
from app.models import MovementPayload


def create_movement(payload: MovementPayload) -> dict[str, Any]:
    movement_id = execute_returning_id(
        """
        INSERT INTO movimientos (
            pendiente_id,
            telegram_user_id,
            chat_id,
            tipo,
            cantidad,
            moneda,
            categoria,
            subcategoria,
            concepto,
            metodo_pago,
            cuenta,
            nota,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, CURRENT_TIMESTAMP))
        """,
        (
            payload.pendiente_id,
            payload.telegram_user_id or 0,
            payload.chat_id or 0,
            payload.tipo,
            payload.cantidad,
            payload.moneda,
            payload.categoria,
            payload.subcategoria,
            payload.concepto,
            payload.metodo_pago,
            payload.cuenta,
            payload.nota,
            payload.created_at,
        ),
    )
    return get_movement(movement_id)


def get_movement(movement_id: int) -> dict[str, Any]:
    row = fetch_one(
        """
        SELECT id, tipo, cantidad, moneda, categoria, subcategoria, concepto,
               metodo_pago, cuenta, nota, created_at
        FROM movimientos
        WHERE id = %s
        """,
        (movement_id,),
    )
    if row is None:
        raise ValueError("Movimiento no encontrado")
    return row


def update_movement(movement_id: int, payload: MovementPayload) -> dict[str, Any]:
    count = execute(
        """
        UPDATE movimientos
        SET tipo = %s,
            cantidad = %s,
            moneda = %s,
            categoria = %s,
            subcategoria = %s,
            concepto = %s,
            metodo_pago = %s,
            cuenta = %s,
            nota = %s,
            created_at = COALESCE(%s, created_at)
        WHERE id = %s
        """,
        (
            payload.tipo,
            payload.cantidad,
            payload.moneda,
            payload.categoria,
            payload.subcategoria,
            payload.concepto,
            payload.metodo_pago,
            payload.cuenta,
            payload.nota,
            payload.created_at,
            movement_id,
        ),
    )
    if count == 0:
        raise ValueError("Movimiento no encontrado")
    return get_movement(movement_id)


def delete_movement(movement_id: int) -> dict[str, bool]:
    count = execute("DELETE FROM movimientos WHERE id = %s", (movement_id,))
    if count == 0:
        raise ValueError("Movimiento no encontrado")
    return {"deleted": True}
