from datetime import date
from typing import Any, Callable, Literal

import pymysql
from fastapi import Depends, File, FastAPI, HTTPException, Query, Request, Response as FastAPIResponse, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.auth import authenticate_user, clear_session_cookie, require_api_key, require_auth, set_session_cookie
from app.banks import create_bank, delete_bank, list_banks, update_bank
from app.config import get_settings
from app.database import fetch_one
from app.export_excel import build_export_workbook
from app.importer import commit_import, preview_import
from app.migrations import run_migrations
from app.models import BankPayload, ImportCommitRequest, LoginRequest, MovementPayload
from app.movements import create_movement, delete_movement, update_movement
from app.queries import (
    get_categories,
    get_export_movements,
    get_expenses_by_category,
    get_expenses_by_period,
    get_month_insights,
    get_month_summary,
    get_movement_types,
    get_movements,
    get_recent_movements,
)

app = FastAPI(title="dashboard financiera")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.on_event("startup")
def startup() -> None:
    try:
        run_migrations()
    except pymysql.MySQLError as exc:
        print(f"No se pudieron ejecutar migraciones automaticamente: {exc}")


def run_db_query(query: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    try:
        return query(*args, **kwargs)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except pymysql.MySQLError as exc:
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar MariaDB. Revisa red, permisos y configuracion.",
        ) from exc


@app.get("/")
def dashboard():
    return FileResponse("app/static/index.html")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "dashboard financiera"}


@app.get("/api/db-health")
def database_health_check(_: str = Depends(require_auth)):
    result = run_db_query(fetch_one, "SELECT 1 AS ok")
    return {"status": "ok", "database": result}


@app.post("/api/auth/login")
def login(payload: LoginRequest, response: FastAPIResponse):
    if not authenticate_user(payload.username, payload.password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    set_session_cookie(response, payload.username)
    return {"username": payload.username}


@app.post("/api/auth/logout")
def logout(response: FastAPIResponse):
    clear_session_cookie(response)
    return {"ok": True}


@app.get("/api/auth/me")
def me(username: str = Depends(require_auth)):
    return {"username": username}


@app.get("/api/summary/month")
def month_summary(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    _: str = Depends(require_auth),
):
    if (year is None) != (month is None):
        raise HTTPException(
            status_code=400,
            detail="Indica year y month juntos, o ninguno para usar el mes actual.",
        )

    return run_db_query(get_month_summary, year=year, month=month)


@app.get("/api/insights/month")
def month_insights(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    _: str = Depends(require_auth),
):
    return run_db_query(get_month_insights, year=year, month=month)


@app.get("/api/movements/recent")
def recent_movements(limit: int = Query(default=10, ge=1, le=100), _: str = Depends(require_auth)):
    return run_db_query(get_recent_movements, limit=limit)


@app.get("/api/movements")
def movements(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    movement_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: str = Depends(require_auth),
):
    return run_db_query(
        get_movements,
        start_date=start_date,
        end_date=end_date,
        category=category,
        movement_type=movement_type,
        limit=limit,
        offset=offset,
    )


@app.post("/api/movements")
def create_movement_endpoint(payload: MovementPayload, _: str = Depends(require_auth)):
    return run_db_query(create_movement, payload)


@app.put("/api/movements/{movement_id}")
def update_movement_endpoint(movement_id: int, payload: MovementPayload, _: str = Depends(require_auth)):
    return run_db_query(update_movement, movement_id, payload)


@app.delete("/api/movements/{movement_id}")
def delete_movement_endpoint(movement_id: int, _: str = Depends(require_auth)):
    return run_db_query(delete_movement, movement_id)


@app.get("/api/export/movements.xlsx")
def export_movements_excel(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    movement_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=10000, ge=1, le=10000),
    _: str = Depends(require_auth),
):
    rows = run_db_query(
        get_export_movements,
        start_date=start_date,
        end_date=end_date,
        category=category,
        movement_type=movement_type,
        limit=limit,
    )
    content = build_export_workbook(
        rows,
        {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "category": category,
            "movement_type": movement_type,
        },
    )

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="movimientos.xlsx"',
        },
    )


@app.get("/api/expenses/by-category")
def expenses_by_category(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    _: str = Depends(require_auth),
):
    return run_db_query(
        get_expenses_by_category,
        start_date=start_date,
        end_date=end_date,
        category=category,
    )


@app.get("/api/expenses/by-period")
def expenses_by_period(
    period: Literal["day", "month"] = "day",
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    _: str = Depends(require_auth),
):
    return run_db_query(
        get_expenses_by_period,
        period=period,
        start_date=start_date,
        end_date=end_date,
        category=category,
    )


@app.get("/api/categories")
def categories(_: str = Depends(require_auth)):
    return run_db_query(get_categories)


@app.get("/api/types")
def movement_types(_: str = Depends(require_auth)):
    return run_db_query(get_movement_types)


@app.get("/api/integrations/status")
def integrations_status(request: Request, _: str = Depends(require_auth)):
    settings = get_settings()
    n8n_path = "/api/integrations/n8n/movements"
    return {
        "n8n_endpoint": n8n_path,
        "n8n_endpoint_url": str(request.base_url).rstrip("/") + n8n_path,
        "api_key_configured": bool(settings.integration_api_key)
        and settings.integration_api_key != "change-this-api-key",
        "api_key_header": "X-API-Key",
    }


@app.get("/api/banks")
def banks(include_inactive: bool = False, _: str = Depends(require_auth)):
    return run_db_query(list_banks, include_inactive=include_inactive)


@app.post("/api/banks")
def create_bank_endpoint(payload: BankPayload, _: str = Depends(require_auth)):
    return run_db_query(create_bank, payload)


@app.put("/api/banks/{bank_id}")
def update_bank_endpoint(bank_id: int, payload: BankPayload, _: str = Depends(require_auth)):
    return run_db_query(update_bank, bank_id, payload)


@app.delete("/api/banks/{bank_id}")
def delete_bank_endpoint(bank_id: int, _: str = Depends(require_auth)):
    return run_db_query(delete_bank, bank_id)


@app.post("/api/integrations/n8n/movements")
def n8n_create_movement(payload: MovementPayload, request: Request):
    require_api_key(request)
    return run_db_query(create_movement, payload)


@app.post("/api/imports/preview")
async def import_preview(file: UploadFile = File(...), _: str = Depends(require_auth)):
    content = await file.read()
    return preview_import(file.filename or "importacion", content)


@app.post("/api/imports/commit")
def import_commit(payload: ImportCommitRequest, _: str = Depends(require_auth)):
    return run_db_query(commit_import, payload)
