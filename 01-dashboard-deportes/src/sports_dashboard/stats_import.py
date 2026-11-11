"""Import match statistics from football-data.co.uk CSV files into match_stats."""

import argparse
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import pandas as pd
from sqlalchemy import Engine, text
from sqlalchemy.exc import OperationalError

from sports_dashboard.config import ConfigError, load_database_url
from sports_dashboard.db import get_engine, init_schema
from sports_dashboard.ingest import _records

DIVISION_TO_COMPETITION = {"SP1": "PD", "E0": "PL", "I1": "SA", "D1": "BL1", "F1": "FL1"}

DEFAULT_FOLDER = Path("data/external/football-data-co-uk")
DEFAULT_ALIASES = Path("data/team_aliases.csv")

# CSV column -> match_stats column (the xG pair is missing in older seasons).
FLOAT_COLUMNS = {"HxG": "home_xg", "AxG": "away_xg"}
INT_COLUMNS = {
    "HS": "home_shots",
    "AS": "away_shots",
    "HST": "home_shots_on_target",
    "AST": "away_shots_on_target",
    "HC": "home_corners",
    "AC": "away_corners",
    "HF": "home_fouls",
    "AF": "away_fouls",
    "HY": "home_yellow",
    "AY": "away_yellow",
    "HR": "home_red",
    "AR": "away_red",
}
STAT_COLUMNS = [*FLOAT_COLUMNS.values(), *INT_COLUMNS.values()]
PARSED_COLUMNS = ["home_name", "away_name", *STAT_COLUMNS, "referee"]

UPSERT_STATS = text(
    "INSERT INTO match_stats (match_id, home_xg, away_xg, home_shots, away_shots, "
    "home_shots_on_target, away_shots_on_target, home_corners, away_corners, "
    "home_fouls, away_fouls, home_yellow, away_yellow, home_red, away_red, referee) "
    "VALUES (:match_id, :home_xg, :away_xg, :home_shots, :away_shots, "
    ":home_shots_on_target, :away_shots_on_target, :home_corners, :away_corners, "
    ":home_fouls, :away_fouls, :home_yellow, :away_yellow, :home_red, :away_red, :referee) "
    "ON CONFLICT (match_id) DO UPDATE SET "
    "home_xg = EXCLUDED.home_xg, away_xg = EXCLUDED.away_xg, "
    "home_shots = EXCLUDED.home_shots, away_shots = EXCLUDED.away_shots, "
    "home_shots_on_target = EXCLUDED.home_shots_on_target, "
    "away_shots_on_target = EXCLUDED.away_shots_on_target, "
    "home_corners = EXCLUDED.home_corners, away_corners = EXCLUDED.away_corners, "
    "home_fouls = EXCLUDED.home_fouls, away_fouls = EXCLUDED.away_fouls, "
    "home_yellow = EXCLUDED.home_yellow, away_yellow = EXCLUDED.away_yellow, "
    "home_red = EXCLUDED.home_red, away_red = EXCLUDED.away_red, "
    "referee = EXCLUDED.referee"
)


class UnmappedTeamError(Exception):
    """Team names that match no team in the database and no alias."""

    def __init__(self, names: list[str]):
        super().__init__("Unmapped team names: " + ", ".join(names))
        self.names = names


@dataclass
class ImportResult:
    matched: int = 0
    unmatched: list[str] = field(default_factory=list)


def season_from_folder(name: str) -> int:
    """Season folder "2627" is the season that starts in 2026."""
    return 2000 + int(name[:2])


def normalize_name(name: str) -> str:
    """Lowercase, no accents or punctuation, single spaces."""
    decomposed = unicodedata.normalize("NFKD", name)
    plain = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", plain.lower()).split())


def load_aliases(path: Path) -> dict[str, int]:
    df = pd.read_csv(path, dtype={"alias": str, "team_id": "Int64"})
    return {normalize_name(row.alias): int(row.team_id) for row in df.itertuples()}


def resolve_team_ids(
    names: Iterable[str], engine: Engine, aliases: dict[str, int]
) -> dict[str, int]:
    """Map each CSV team name to a team id; raise UnmappedTeamError listing all failures."""
    known = dict(aliases)
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, name, short_name FROM teams")).all()
    for team_id, name, short_name in rows:
        for label in (name, short_name):
            if label:
                known.setdefault(normalize_name(label), team_id)
    resolved: dict[str, int] = {}
    missing: set[str] = set()
    for name in names:
        team_id = known.get(normalize_name(name))
        if team_id is None:
            missing.add(name)
        else:
            resolved[name] = team_id
    if missing:
        raise UnmappedTeamError(sorted(missing))
    return resolved


def parse_stats_csv(source) -> pd.DataFrame:
    """Read the statistics columns of one CSV file (a path or a file-like object)."""
    raw = pd.read_csv(source, skip_blank_lines=True)
    out = pd.DataFrame(index=raw.index)
    out["home_name"] = _text_column(raw, "HomeTeam")
    out["away_name"] = _text_column(raw, "AwayTeam")
    for column, target in FLOAT_COLUMNS.items():
        out[target] = _number_column(raw, column).astype("float64")
    for column, target in INT_COLUMNS.items():
        out[target] = _number_column(raw, column).astype("Int64")
    out["referee"] = _text_column(raw, "Referee")
    out = out[out["home_name"].notna()]
    return out[PARSED_COLUMNS].reset_index(drop=True)


def _text_column(raw: pd.DataFrame, column: str) -> pd.Series:
    if column not in raw:
        return pd.Series(pd.NA, index=raw.index, dtype="object")
    return raw[column].astype("string").str.strip().astype("object")


def _number_column(raw: pd.DataFrame, column: str) -> pd.Series:
    if column not in raw:
        return pd.Series(float("nan"), index=raw.index)
    return pd.to_numeric(raw[column], errors="coerce")


def import_stats(
    engine: Engine, csv_path: Path, competition: str, season: int, aliases: dict[str, int]
) -> ImportResult:
    """Upsert one CSV file into match_stats, in one transaction."""
    init_schema(engine)
    df = parse_stats_csv(csv_path)
    ids = resolve_team_ids([*df["home_name"], *df["away_name"]], engine, aliases)
    result = ImportResult()
    rows = []
    with engine.begin() as conn:
        match_ids = {
            (home, away): match_id
            for match_id, home, away in conn.execute(
                text(
                    "SELECT id, home_team_id, away_team_id FROM matches "
                    "WHERE competition = :competition AND season = :season"
                ),
                {"competition": competition, "season": season},
            )
        }
        for record in _records(df):
            home, away = record.pop("home_name"), record.pop("away_name")
            match_id = match_ids.get((ids[home], ids[away]))
            if match_id is None:
                result.unmatched.append(f"{home} - {away}")
                continue
            rows.append({"match_id": match_id, **record})
        if rows:
            conn.execute(UPSERT_STATS, rows)
    result.matched = len(rows)
    return result


def _find_files(folder: Path) -> list[tuple[Path, str, int]]:
    """Every <folder>/<yyzz>/<DIV>.csv as (path, competition, season), in sorted order."""
    found = []
    for season_dir in sorted(folder.glob("[0-9][0-9][0-9][0-9]")):
        if not season_dir.is_dir():
            continue
        for division, competition in DIVISION_TO_COMPETITION.items():
            path = season_dir / f"{division}.csv"
            if path.is_file():
                found.append((path, competition, season_from_folder(season_dir.name)))
    return found


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Import football-data.co.uk match statistics into PostgreSQL"
    )
    parser.add_argument("--folder", type=Path, default=DEFAULT_FOLDER)
    parser.add_argument("--aliases", type=Path, default=DEFAULT_ALIASES)
    args = parser.parse_args(argv)

    files = _find_files(args.folder)
    if not files:
        print(f"Error: no <yyzz>/<DIV>.csv files under {args.folder}.", file=sys.stderr)
        return 1
    try:
        engine = get_engine(load_database_url())
        init_schema(engine)
        aliases = load_aliases(args.aliases)
        names: set[str] = set()
        for path, _, _ in files:
            df = parse_stats_csv(path)
            names.update(df["home_name"])
            names.update(df["away_name"])
        try:
            resolve_team_ids(names, engine, aliases)
        except UnmappedTeamError as error:
            print("Unmapped team names (add them to the aliases file):", file=sys.stderr)
            for name in error.names:
                print(name, file=sys.stderr)
            return 1
        for path, competition, season in files:
            result = import_stats(engine, path, competition, season, aliases)
            print(
                f"{competition} {season}: {result.matched} matched, "
                f"{len(result.unmatched)} unmatched",
                flush=True,
            )
    except ConfigError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except OperationalError:
        print(
            "Error: could not connect to PostgreSQL. Is it running (docker compose up -d)?",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
