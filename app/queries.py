from datetime import date, timedelta
from typing import Any

from app.database import fetch_all, fetch_one


EXPENSE_TYPES = ("gasto", "gastos", "expense", "egreso", "egresos")
INCOME_TYPES = ("ingreso", "ingresos", "income")


def current_month_range(today: date | None = None) -> tuple[date, date]:
    today = today or date.today()
    start = today.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def selected_month_range(year: int | None, month: int | None) -> tuple[date, date]:
    if year is None or month is None:
        return current_month_range()

    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start, end


def inclusive_end(end_date: date | None) -> date | None:
    if end_date is None:
        return None
    return end_date + timedelta(days=1)


def type_placeholders(values: tuple[str, ...]) -> str:
    return ", ".join(["%s"] * len(values))


def build_movement_filters(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    movement_type: str | None = None,
) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    if start_date is not None:
        clauses.append("created_at >= %s")
        params.append(start_date)

    end_exclusive = inclusive_end(end_date)
    if end_exclusive is not None:
        clauses.append("created_at < %s")
        params.append(end_exclusive)

    if category:
        clauses.append("categoria = %s")
        params.append(category)

    if movement_type:
        clauses.append("LOWER(tipo) = LOWER(%s)")
        params.append(movement_type)

    where_sql = ""
    if clauses:
        where_sql = "WHERE " + " AND ".join(clauses)

    return where_sql, params


def get_month_summary(year: int | None = None, month: int | None = None) -> dict[str, Any]:
    start, end = selected_month_range(year, month)
    expense_placeholders = type_placeholders(EXPENSE_TYPES)
    income_placeholders = type_placeholders(INCOME_TYPES)

    row = fetch_one(
        f"""
        SELECT
            COALESCE(SUM(CASE WHEN LOWER(tipo) IN ({expense_placeholders}) THEN cantidad ELSE 0 END), 0) AS total_expenses,
            COALESCE(SUM(CASE WHEN LOWER(tipo) IN ({income_placeholders}) THEN cantidad ELSE 0 END), 0) AS total_income,
            COUNT(*) AS movement_count,
            COALESCE(MAX(moneda), 'EUR') AS currency
        FROM movimientos
        WHERE created_at >= %s AND created_at < %s
        """,
        (*EXPENSE_TYPES, *INCOME_TYPES, start, end),
    ) or {}

    total_expenses = row.get("total_expenses") or 0
    total_income = row.get("total_income") or 0
    row["balance"] = total_income - total_expenses
    row["period"] = {"start": start.isoformat(), "end": end.isoformat()}
    return row


def get_recent_movements(limit: int = 10) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 100))
    return fetch_all(
        """
        SELECT
            id,
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
        FROM movimientos
        ORDER BY created_at DESC, id DESC
        LIMIT %s
        """,
        (limit,),
    )


def get_movements(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    movement_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    where_sql, params = build_movement_filters(
        start_date=start_date,
        end_date=end_date,
        category=category,
        movement_type=movement_type,
    )

    return fetch_all(
        f"""
        SELECT
            id,
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
        FROM movimientos
        {where_sql}
        ORDER BY created_at DESC, id DESC
        LIMIT %s OFFSET %s
        """,
        (*params, limit, offset),
    )


def get_expenses_by_category(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
) -> list[dict[str, Any]]:
    where_sql, params = build_movement_filters(
        start_date=start_date,
        end_date=end_date,
        category=category,
    )
    expense_placeholders = type_placeholders(EXPENSE_TYPES)
    type_clause = f"LOWER(tipo) IN ({expense_placeholders})"

    if where_sql:
        where_sql = f"{where_sql} AND {type_clause}"
    else:
        where_sql = f"WHERE {type_clause}"

    return fetch_all(
        f"""
        SELECT
            COALESCE(NULLIF(categoria, ''), 'Sin categoria') AS category,
            COALESCE(SUM(cantidad), 0) AS total,
            COUNT(*) AS movement_count
        FROM movimientos
        {where_sql}
        GROUP BY COALESCE(NULLIF(categoria, ''), 'Sin categoria')
        ORDER BY total DESC
        """,
        (*params, *EXPENSE_TYPES),
    )


def get_expenses_by_period(
    period: str = "day",
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
) -> list[dict[str, Any]]:
    if period == "month":
        period_expression = "DATE_FORMAT(created_at, '%Y-%m')"
    else:
        period_expression = "DATE(created_at)"

    where_sql, params = build_movement_filters(
        start_date=start_date,
        end_date=end_date,
        category=category,
    )
    expense_placeholders = type_placeholders(EXPENSE_TYPES)
    type_clause = f"LOWER(tipo) IN ({expense_placeholders})"

    if where_sql:
        where_sql = f"{where_sql} AND {type_clause}"
    else:
        where_sql = f"WHERE {type_clause}"

    return fetch_all(
        f"""
        SELECT
            {period_expression} AS period,
            COALESCE(SUM(cantidad), 0) AS total,
            COUNT(*) AS movement_count
        FROM movimientos
        {where_sql}
        GROUP BY {period_expression}
        ORDER BY period ASC
        """,
        (*params, *EXPENSE_TYPES),
    )


def get_categories() -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT DISTINCT categoria AS category
        FROM movimientos
        WHERE categoria IS NOT NULL AND categoria <> ''
        ORDER BY categoria ASC
        """
    )


def get_movement_types() -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT DISTINCT tipo AS type
        FROM movimientos
        WHERE tipo IS NOT NULL AND tipo <> ''
        ORDER BY tipo ASC
        """
    )
