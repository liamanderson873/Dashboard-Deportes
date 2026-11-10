import os
import subprocess
import sys
from pathlib import Path

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
    assert "--season" in result.stdout


def test_main_reports_config_error_without_traceback(monkeypatch, capsys):
    def missing_key():
        raise ConfigError("Missing environment variable FOOTBALL_API_KEY.")

    monkeypatch.setattr(ingest_module, "load_settings", missing_key)

    code = ingest_module.main(["--season", "2024"])

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

        monkeypatch.setattr(ingest_module, "ingest", failing)

        code = ingest_module.main(["--season", "2024"])

        captured = capsys.readouterr()
        assert code == 1
        assert str(error) in captured.err
        assert "Traceback" not in captured.err


def test_default_database_urls_use_ipv4_loopback_not_localhost():
    from conftest import TEST_DATABASE_URL

    template = (PROJECT / ".env.example").read_text(encoding="utf-8")

    assert "@127.0.0.1:5433/" in template
    assert "@127.0.0.1:5433/" in TEST_DATABASE_URL


def test_docker_compose_publishes_postgres_on_localhost_only():
    compose = (PROJECT / "docker-compose.yml").read_text(encoding="utf-8")

    assert '"127.0.0.1:5433:5432"' in compose
