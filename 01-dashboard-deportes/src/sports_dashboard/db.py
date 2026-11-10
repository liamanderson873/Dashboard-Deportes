from pathlib import Path

from sqlalchemy import Engine, create_engine

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "sql" / "schema.sql"


def get_engine(url: str) -> Engine:
    return create_engine(url)


def init_schema(engine: Engine) -> None:
    """Create the tables if they do not exist yet. Safe to call repeatedly."""
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with engine.begin() as conn:
        conn.exec_driver_sql(sql)
