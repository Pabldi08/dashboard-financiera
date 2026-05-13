from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import requests

from app.config import get_settings
from app.database import execute, fetch_one
from app.models import MovementPayload
from app.movements import create_movement
from app.queries import get_month_summary, get_recent_movements


def parse_telegram_movement(text: str, chat_id: int | None = None, user_id: int | None = None) -> MovementPayload:
    parts = text.strip().split()
    movement_type = "gasto"
    if parts and parts[0].lower() in {"/gasto", "gasto"}:
        movement_type = "gasto"
        parts = parts[1:]
    elif parts and parts[0].lower() in {"/ingreso", "ingreso"}:
        movement_type = "ingreso"
        parts = parts[1:]

    if len(parts) < 2:
        raise ValueError("Formato: /gasto 12.50 comida concepto opcional")

    try:
        amount = Decimal(parts[0].replace(",", "."))
    except InvalidOperation as exc:
        raise ValueError("No pude leer la cantidad") from exc

    category = parts[1]
    concept = " ".join(parts[2:]) if len(parts) > 2 else None
    return MovementPayload(
        tipo=movement_type,
        cantidad=amount,
        categoria=category,
        concepto=concept,
        telegram_user_id=user_id,
        chat_id=chat_id,
        created_at=datetime.now(),
    )


def telegram_api(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    token = get_settings().telegram_bot_token
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN no configurado")
    response = requests.post(f"https://api.telegram.org/bot{token}/{method}", json=payload, timeout=20)
    response.raise_for_status()
    return response.json()


def send_message(chat_id: int, text: str) -> None:
    telegram_api("sendMessage", {"chat_id": chat_id, "text": text})


def is_processed(update_id: int) -> bool:
    return fetch_one("SELECT id FROM telegram_messages WHERE update_id = %s", (update_id,)) is not None


def mark_processed(update: dict[str, Any], movement_id: int | None = None) -> None:
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    user = message.get("from") or {}
    execute(
        """
        INSERT IGNORE INTO telegram_messages (update_id, message_id, chat_id, telegram_user_id, text, movement_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            update.get("update_id"),
            message.get("message_id"),
            chat.get("id"),
            user.get("id"),
            message.get("text"),
            movement_id,
        ),
    )


def handle_update(update: dict[str, Any]) -> None:
    update_id = update.get("update_id")
    if update_id is None or is_processed(update_id):
        return

    message = update.get("message") or {}
    text = str(message.get("text") or "").strip()
    chat_id = (message.get("chat") or {}).get("id")
    user_id = (message.get("from") or {}).get("id")

    try:
        if text == "/ayuda":
            send_message(chat_id, "Usa: /gasto 12.50 comida concepto o /ingreso 1000 nomina")
            mark_processed(update)
            return
        if text == "/resumen":
            summary = get_month_summary()
            send_message(
                chat_id,
                f"Mes actual: gastos {summary['total_expenses']} EUR, ingresos {summary['total_income']} EUR, balance {summary['balance']} EUR",
            )
            mark_processed(update)
            return
        if text == "/ultimo":
            recent = get_recent_movements(1)
            send_message(chat_id, str(recent[0]) if recent else "No hay movimientos")
            mark_processed(update)
            return

        payload = parse_telegram_movement(text, chat_id=chat_id, user_id=user_id)
        created = create_movement(payload)
        send_message(chat_id, f"Guardado: {created['tipo']} {created['cantidad']} EUR en {created.get('categoria')}")
        mark_processed(update, movement_id=created["id"])
    except Exception as exc:
        send_message(chat_id, f"No pude guardar el movimiento: {exc}")
        mark_processed(update)


def run_polling() -> None:
    offset = None
    while True:
        payload = {"timeout": 30}
        if offset is not None:
            payload["offset"] = offset
        result = telegram_api("getUpdates", payload)
        for update in result.get("result", []):
            handle_update(update)
            offset = int(update["update_id"]) + 1
