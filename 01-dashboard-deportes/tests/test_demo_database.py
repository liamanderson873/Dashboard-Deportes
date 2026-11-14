import importlib.util
import json
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "demo_database", Path(__file__).parents[1] / "scripts/demo_database.py"
)
demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)


def test_restore_cannot_target_the_source_database(monkeypatch, tmp_path):
    monkeypatch.setattr(
        demo,
        "database_tables",
        lambda _: pytest.fail("Must refuse before reading target"),
    )
    with pytest.raises(ValueError, match="differ"):
        demo.restore(
            "postgresql://demo@host/data?sslmode=require",
            "postgresql+psycopg://owner@host:5432/data",
            tmp_path / "snapshot.dump",
        )


def test_restore_cannot_overwrite_an_existing_database(monkeypatch, tmp_path):
    monkeypatch.setattr(demo, "database_tables", lambda _: {"existing": 1})
    monkeypatch.setattr(
        demo, "pgtool", lambda _: pytest.fail("Must not run restore tools")
    )
    with pytest.raises(ValueError, match="no user tables"):
        demo.restore("postgresql://demo@host/demo", None, tmp_path / "snapshot.dump")


def test_changed_snapshot_is_rejected_before_executing_sql(monkeypatch, tmp_path):
    monkeypatch.setattr(demo, "database_tables", lambda _: {})
    monkeypatch.setattr(
        demo, "pgtool", lambda _: pytest.fail("Must not execute a modified snapshot")
    )
    file = tmp_path / "snapshot.dump"
    file.write_bytes(b"changed")
    file.with_suffix(".manifest.json").write_text(
        json.dumps({"sha256": "wrong", "tables": {}})
    )
    with pytest.raises(ValueError, match="checksum"):
        demo.restore("postgresql://demo@host/demo", None, file)


def test_libpq_configuration_preserves_tls_and_encoded_credentials(monkeypatch):
    monkeypatch.delenv("PGPASSWORD", raising=False)
    env = demo.connection_env(
        "postgresql://reader:p%40ss@db.example:5433/demo?sslmode=require&channel_binding=require"
    )
    assert env["PGDATABASE"] == "demo"
    assert env["PGPASSWORD"] == "p@ss"
    assert env["PGSSLMODE"] == "require"
    assert env["PGCHANNELBINDING"] == "require"
    assert env["PGPORT"] == "5433"
