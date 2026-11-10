from pathlib import Path

import pytest
from conftest import TEST_DATABASE_URL
from streamlit.testing.v1 import AppTest

APP = str(Path(__file__).resolve().parents[1] / "app.py")


@pytest.fixture
def run_app(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)

    def _run():
        return AppTest.from_file(APP, default_timeout=30).run()

    return _run


def test_app_runs_with_empty_db_and_shows_info(engine, run_app):
    at = run_app()

    assert not at.exception
    assert any("ingest" in info.value for info in at.info)


def test_app_shows_standings_table_with_seeded_data(seeded, run_app):
    at = run_app()

    assert not at.exception
    standings = [df.value for df in at.dataframe if "points" in df.value.columns]
    assert standings, "the standings table must be on the page"
    assert list(standings[0]["team"]) == ["A", "B", "C"]
