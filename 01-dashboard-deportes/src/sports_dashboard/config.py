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


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    if env is None:
        load_dotenv()
        env = os.environ
    return Settings(
        database_url=_require(env, "DATABASE_URL"),
        football_api_key=_require(env, "FOOTBALL_API_KEY"),
    )
