import base64
import hashlib
import hmac
import time
from typing import Annotated

from fastapi import Cookie, HTTPException, Request, Response

from app.config import get_settings


SESSION_COOKIE = "dashboard_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 14


def sign_value(value: str) -> str:
    secret = get_settings().app_secret_key.encode("utf-8")
    return hmac.new(secret, value.encode("utf-8"), hashlib.sha256).hexdigest()


def create_session_token(username: str) -> str:
    payload = f"{username}:{int(time.time())}"
    encoded = base64.urlsafe_b64encode(payload.encode("utf-8")).decode("ascii")
    return f"{encoded}.{sign_value(encoded)}"


def verify_session_token(token: str | None) -> str | None:
    if not token or "." not in token:
        return None

    encoded, signature = token.rsplit(".", 1)
    if not hmac.compare_digest(signature, sign_value(encoded)):
        return None

    try:
        payload = base64.urlsafe_b64decode(encoded.encode("ascii")).decode("utf-8")
        username, issued_at_raw = payload.rsplit(":", 1)
        issued_at = int(issued_at_raw)
    except (ValueError, UnicodeDecodeError):
        return None

    if time.time() - issued_at > SESSION_MAX_AGE:
        return None

    return username


def authenticate_user(username: str, password: str) -> bool:
    settings = get_settings()
    return hmac.compare_digest(username, settings.app_admin_user) and hmac.compare_digest(
        password,
        settings.app_admin_password,
    )


def set_session_cookie(response: Response, username: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(username),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE)


def require_auth(
    dashboard_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> str:
    username = verify_session_token(dashboard_session)
    if username is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    return username


def require_api_key(request: Request) -> None:
    expected = get_settings().integration_api_key
    provided = request.headers.get("X-API-Key")
    if not expected or expected == "change-this-api-key" or not hmac.compare_digest(provided or "", expected):
        raise HTTPException(status_code=401, detail="API key invalida")
