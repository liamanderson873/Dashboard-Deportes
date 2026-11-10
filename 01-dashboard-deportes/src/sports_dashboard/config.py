import os
from dataclasses import dataclass
from typing import Mapping

from dotenv import load_dotenv


class ConfigError(Exception):
    pass


@dataclass(frozen=True)
class Settings:
    database_url: str
    football_api_key: str


def _require(env: Mapping[str, str], name: str) -> str:
    value = env.get(name)
    if not value:
        raise ConfigError(
            f"Missing environment variable {name}. Copy .env.example to .env and fill it in."
        )
    return value


def _environment(env: Mapping[str, str] | None) -> Mapping[str, str]:
    if env is None:
        load_dotenv()
        return os.environ
    return env


def load_database_url(env: Mapping[str, str] | None = None) -> str:
    """Only the database URL: the dashboard does not need the football-data.org key."""
    return _require(_environment(env), "DATABASE_URL")


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    env = _environment(env)
    return Settings(
        database_url=_require(env, "DATABASE_URL"),
        football_api_key=_require(env, "FOOTBALL_API_KEY"),
    )
