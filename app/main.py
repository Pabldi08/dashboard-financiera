from datetime import date
from typing import Any, Callable, Literal

import pymysql
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import fetch_one
from app.queries import (
    get_categories,
    get_expenses_by_category,
    get_expenses_by_period,
    get_month_summary,
    get_movement_types,
    get_movements,
    get_recent_movements,
)

app = FastAPI(title="dashboard financiera")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


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
def database_health_check():
    result = run_db_query(fetch_one, "SELECT 1 AS ok")
    return {"status": "ok", "database": result}


@app.get("/api/summary/month")
def month_summary(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
):
    if (year is None) != (month is None):
        raise HTTPException(
            status_code=400,
            detail="Indica year y month juntos, o ninguno para usar el mes actual.",
        )

    return run_db_query(get_month_summary, year=year, month=month)


@app.get("/api/movements/recent")
def recent_movements(limit: int = Query(default=10, ge=1, le=100)):
    return run_db_query(get_recent_movements, limit=limit)


@app.get("/api/movements")
def movements(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    movement_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
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


@app.get("/api/expenses/by-category")
def expenses_by_category(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
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
):
    return run_db_query(
        get_expenses_by_period,
        period=period,
        start_date=start_date,
        end_date=end_date,
        category=category,
    )


@app.get("/api/categories")
def categories():
    return run_db_query(get_categories)


@app.get("/api/types")
def movement_types():
    return run_db_query(get_movement_types)
