"""Bounded, attributed NBA Stats archive reader. Archive years are END years."""

import json
import time
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / "data" / "external" / "nba"
RAW = "https://raw.githubusercontent.com/sportsdataverse/hoopR-nba-stats-data/main/nba_stats"
RELEASE = "https://github.com/sportsdataverse/sportsdataverse-data/releases/download"
REGISTRY = {
    "team_game_logs": (
        f"{RELEASE}/nba_stats_team_game_logs/team_game_logs_{{year}}.parquet",
        {"team_id", "game_id", "game_date", "pts", "season"},
    ),
    "shots": (
        f"{RELEASE}/nba_stats_shots/shots_{{year}}.parquet",
        {"game_id", "season"},
    ),
    "player_season_stats": (
        f"{RAW}/player_season_stats/parquet/player_season_stats_{{year}}.parquet",
        {"player_id", "player_name", "season", "measure_type", "per_mode"},
    ),
    "team_season_stats": (
        f"{RAW}/team_season_stats/parquet/team_season_stats_{{year}}.parquet",
        {"team_id", "season", "measure_type", "per_mode"},
    ),
    "schedules": (
        f"{RAW}/schedules/parquet/nba_schedule_{{year}}.parquet",
        {"game_id", "home_team_id", "away_team_id", "game_date", "season"},
    ),
    "player_game_logs": (
        f"{RAW}/player_game_logs/parquet/player_game_logs_{{year}}.parquet",
        {"player_id", "player_name", "team_id", "game_id", "season"},
    ),
    "rosters": (f"{RAW}/rosters/parquet/rosters_{{year}}.parquet", {"season"}),
    "standings": (f"{RAW}/standings/parquet/standings_{{year}}.parquet", {"season"}),
}


class SourceError(RuntimeError):
    pass


def archive_url(dataset: str, season: int) -> str:
    if dataset not in REGISTRY or not 1996 <= season <= datetime.now(UTC).year:
        raise ValueError("Unknown dataset or invalid season start year")
    return REGISTRY[dataset][0].format(year=season + 1)


def validate_frame(dataset: str, season: int, frame: pd.DataFrame) -> None:
    if not REGISTRY[dataset][1].issubset(frame.columns) or frame.empty:
        raise SourceError(f"{dataset}: missing columns or empty file")
    years = pd.to_numeric(frame["season"], errors="coerce")
    if years.isna().any() or not years.eq(season + 1).all():
        raise SourceError(f"{dataset}: wrong season in provider file")


def load_frame(
    dataset: str, season: int, refresh: bool = False, cache: Path = CACHE
) -> tuple[pd.DataFrame, dict]:
    url = archive_url(dataset, season)
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / f"{dataset}_{season + 1}.parquet"
    meta_path = path.with_suffix(".json")
    fresh = (
        path.exists()
        and meta_path.exists()
        and time.time() - path.stat().st_mtime < 86400
    )
    if fresh and not refresh:
        metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        if sha256(path.read_bytes()).hexdigest() != metadata.get("sha256"):
            raise SourceError(f"{dataset}: cache checksum mismatch; use --refresh")
        frame = pd.read_parquet(path)
        validate_frame(dataset, season, frame)
        return frame, metadata
    # Fixed public sources only. No credentials, arbitrary URLs or unbounded retries.
    try:
        with requests.get(url, timeout=(10, 45), stream=True) as response:
            response.raise_for_status()
            chunks, size = [], 0
            for chunk in response.iter_content(1024 * 1024):
                size += len(chunk)
                if size > 80 * 1024 * 1024:
                    raise SourceError(f"{dataset}: download exceeds 80 MiB")
                chunks.append(chunk)
        content = b"".join(chunks)
        if not content.startswith(b"PAR1") or not content.endswith(b"PAR1"):
            raise SourceError(f"{dataset}: response is not a parquet file")
        from io import BytesIO

        frame = pd.read_parquet(BytesIO(content))
        validate_frame(dataset, season, frame)
    except requests.RequestException as error:
        raise SourceError(
            f"{dataset} {season}: source request failed ({type(error).__name__})"
        ) from error
    metadata = {
        "source": "SportsDataverse · NBA Stats",
        "url": url,
        "rows": len(frame),
        "sha256": sha256(content).hexdigest(),
        "fetched": datetime.now(UTC).isoformat(),
        "attribution": "hoopR.nba.stats authors · CC BY 4.0; normalized by Marcador",
    }
    # Only validated responses replace a previous usable cache.
    temporary = path.with_suffix(".tmp")
    temporary.write_bytes(content)
    temporary.replace(path)
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return frame, metadata
