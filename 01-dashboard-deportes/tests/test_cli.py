import os
import subprocess
import sys
from pathlib import Path

import pytest

from sports_dashboard import ingest as ingest_module
from sports_dashboard.client import ApiAccessError, ApiAuthError, ApiRateLimitError
from sports_dashboard.config import ConfigError, Settings

PROJECT = Path(__file__).resolve().parents[1]


def test_ingest_module_runs_from_any_directory(tmp_path):
    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}

    result = subprocess.run(
        [sys.executable, "-m", "sports_dashboard.ingest", "--help"],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "--seasons" in result.stdout


def test_main_reports_config_error_without_traceback(monkeypatch, capsys):
    def missing_key():
        raise ConfigError("Missing environment variable FOOTBALL_API_KEY.")

    monkeypatch.setattr(ingest_module, "load_settings", missing_key)

    code = ingest_module.main(["--seasons", "2024"])

    captured = capsys.readouterr()
    assert code == 1
    assert "FOOTBALL_API_KEY" in captured.err
    assert "Traceback" not in captured.err


def test_main_reports_api_errors_without_traceback(monkeypatch, capsys):
    monkeypatch.setattr(ingest_module, "load_settings", lambda: Settings("x", "k"))
    monkeypatch.setattr(ingest_module, "get_engine", lambda url: None)

    for error in (ApiAuthError("bad key"), ApiAccessError("not in plan"), ApiRateLimitError("slow down")):

        def failing(*args, _error=error, **kwargs):
            raise _error

        monkeypatch.setattr(ingest_module, "run", failing)

        code = ingest_module.main(["--seasons", "2024"])

        captured = capsys.readouterr()
        assert code == 1
        assert str(error) in captured.err
        assert "Traceback" not in captured.err


def test_main_reports_unknown_competition_without_traceback(monkeypatch, capsys):
    monkeypatch.setattr(ingest_module, "load_settings", lambda: Settings("x", "k"))
    monkeypatch.setattr(ingest_module, "get_engine", lambda url: None)

    def unknown(*args, **kwargs):
        raise ValueError("Unknown competition code: XX")

    monkeypatch.setattr(ingest_module, "run", unknown)

    code = ingest_module.main(["--competitions", "XX", "--seasons", "2024"])

    captured = capsys.readouterr()
    assert code == 1
    assert "Unknown competition code: XX" in captured.err
    assert "Traceback" not in captured.err


def test_main_rejects_a_missing_seasons_argument():
    with pytest.raises(SystemExit) as exit_info:
        ingest_module.main([])

    assert exit_info.value.code == 2


def test_main_passes_parsed_arguments_to_run(monkeypatch):
    seen = {}

    def fake_run(engine, client, competitions, seasons, what):
        seen.update(competitions=competitions, seasons=seasons, what=what)
        return ingest_module.RunReport(
            written={"competitions": 2, "matches": 0, "players": 0, "scorers": 0},
            failures=[],
        )

    monkeypatch.setattr(ingest_module, "load_settings", lambda: Settings("x", "k"))
    monkeypatch.setattr(ingest_module, "get_engine", lambda url: None)
    monkeypatch.setattr(ingest_module, "FootballDataClient", lambda key: None)
    monkeypatch.setattr(ingest_module, "run", fake_run)

    code = ingest_module.main(
        ["--competitions", "PD,PL", "--seasons", "2024,2025", "--what", "scorers"]
    )

    assert code == 0
    assert seen == {"competitions": ["PD", "PL"], "seasons": [2024, 2025], "what": ("scorers",)}


def test_main_returns_1_and_prints_failures_when_the_report_has_failures(monkeypatch, capsys):
    monkeypatch.setattr(ingest_module, "load_settings", lambda: Settings("x", "k"))
    monkeypatch.setattr(ingest_module, "get_engine", lambda url: None)
    monkeypatch.setattr(ingest_module, "FootballDataClient", lambda key: None)
    monkeypatch.setattr(
        ingest_module,
        "run",
        lambda *args, **kwargs: ingest_module.RunReport(
            written={"competitions": 1, "matches": 0, "players": 0, "scorers": 0},
            failures=["FL1 2024 matches: not in your plan"],
        ),
    )

    code = ingest_module.main(["--competitions", "FL1", "--seasons", "2024"])

    captured = capsys.readouterr()
    assert code == 1
    assert "FL1 2024 matches" in captured.err


def test_default_database_urls_use_ipv4_loopback_not_localhost():
    # Read the files, not conftest.TEST_DATABASE_URL: CI overrides that variable on purpose.
    template = (PROJECT / ".env.example").read_text(encoding="utf-8")
    conftest = (PROJECT / "tests" / "conftest.py").read_text(encoding="utf-8")

    assert "@127.0.0.1:5433/" in template
    assert "@127.0.0.1:5433/" in conftest


def test_docker_compose_publishes_postgres_on_localhost_only():
    compose = (PROJECT / "docker-compose.yml").read_text(encoding="utf-8")

    assert '"127.0.0.1:5433:5432"' in compose
