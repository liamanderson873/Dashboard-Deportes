import pytest

from sports_dashboard.config import ConfigError, load_settings


def test_loads_both_values():
    settings = load_settings({"DATABASE_URL": "postgresql://u:p@h/db", "FOOTBALL_API_KEY": "abc"})

    assert settings.database_url == "postgresql://u:p@h/db"
    assert settings.football_api_key == "abc"


def test_missing_api_key_raises_config_error_naming_variable():
    with pytest.raises(ConfigError) as exc:
        load_settings({"DATABASE_URL": "x"})

    assert "FOOTBALL_API_KEY" in str(exc.value)
