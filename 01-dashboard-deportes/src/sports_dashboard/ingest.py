import argparse
import sys
from dataclasses import dataclass, field

import pandas as pd
import requests
from sqlalchemy import Engine, text
from sqlalchemy.exc import OperationalError

from sports_dashboard.client import (
    ApiAccessError,
    ApiAuthError,
    ApiRateLimitError,
    FootballDataClient,
)
from sports_dashboard.config import ConfigError, load_settings
from sports_dashboard.db import get_engine, init_schema
from sports_dashboard.transform import clean_matches, clean_scorers, clean_teams

# Writes id and name only: the profile columns stay as they are.
UPSERT_TEAM = text(
    "INSERT INTO teams (id, name) VALUES (:id, :name) "
    "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name"
)

UPSERT_TEAM_PROFILE = text(
    "INSERT INTO teams (id, name, short_name, tla, crest, founded, venue, club_colors, "
    "website, coach) "
    "VALUES (:id, :name, :short_name, :tla, :crest, :founded, :venue, :club_colors, "
    ":website, :coach) "
    "ON CONFLICT (id) DO UPDATE SET "
    "name = EXCLUDED.name, short_name = EXCLUDED.short_name, tla = EXCLUDED.tla, "
    "crest = EXCLUDED.crest, founded = EXCLUDED.founded, venue = EXCLUDED.venue, "
    "club_colors = EXCLUDED.club_colors, website = EXCLUDED.website, "
    "coach = EXCLUDED.coach"
)

UPSERT_PLAYER = text(
    "INSERT INTO players (id, team_id, name, position, nationality, date_of_birth) "
    "VALUES (:id, :team_id, :name, :position, :nationality, :date_of_birth) "
    "ON CONFLICT (id) DO UPDATE SET "
    "team_id = EXCLUDED.team_id, name = EXCLUDED.name, position = EXCLUDED.position, "
    "nationality = EXCLUDED.nationality, date_of_birth = EXCLUDED.date_of_birth"
)

# Players seen in a scorers list: the squad is the source of truth, so an existing
# player keeps team_id and a null here never erases a stored value.
UPSERT_SCORER_PLAYER = text(
    "INSERT INTO players (id, team_id, name, position, nationality, date_of_birth) "
    "VALUES (:id, :team_id, :name, :position, :nationality, :date_of_birth) "
    "ON CONFLICT (id) DO UPDATE SET "
    "name = COALESCE(EXCLUDED.name, players.name), "
    "position = COALESCE(EXCLUDED.position, players.position), "
    "nationality = COALESCE(EXCLUDED.nationality, players.nationality), "
    "date_of_birth = COALESCE(EXCLUDED.date_of_birth, players.date_of_birth)"
)

UPSERT_SCORER = text(
    "INSERT INTO scorers (competition, season, player_id, team_id, goals, assists, "
    "penalties, played_matches) "
    "VALUES (:competition, :season, :player_id, :team_id, :goals, :assists, "
    ":penalties, :played_matches) "
    "ON CONFLICT (competition, season, player_id) DO UPDATE SET "
    "team_id = EXCLUDED.team_id, goals = EXCLUDED.goals, assists = EXCLUDED.assists, "
    "penalties = EXCLUDED.penalties, played_matches = EXCLUDED.played_matches"
)

UPSERT_COMPETITION = text(
    "INSERT INTO competitions (code, name, area) VALUES (:code, :name, :area) "
    "ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area"
)

UPSERT_MATCH = text(
    "INSERT INTO matches (id, competition, season, matchday, utc_date, status, "
    "home_team_id, away_team_id, home_goals, away_goals, home_ht_goals, away_ht_goals) "
    "VALUES (:id, :competition, :season, :matchday, :utc_date, :status, "
    ":home_team_id, :away_team_id, :home_goals, :away_goals, :home_ht_goals, :away_ht_goals) "
    "ON CONFLICT (id) DO UPDATE SET "
    "competition = EXCLUDED.competition, season = EXCLUDED.season, "
    "matchday = EXCLUDED.matchday, utc_date = EXCLUDED.utc_date, "
    "status = EXCLUDED.status, home_team_id = EXCLUDED.home_team_id, "
    "away_team_id = EXCLUDED.away_team_id, home_goals = EXCLUDED.home_goals, "
    "away_goals = EXCLUDED.away_goals, home_ht_goals = EXCLUDED.home_ht_goals, "
    "away_ht_goals = EXCLUDED.away_ht_goals"
)

STEPS = ("teams", "matches", "scorers")


@dataclass
class RunReport:
    written: dict[str, int] = field(
        default_factory=lambda: {"competitions": 0, "matches": 0, "players": 0, "scorers": 0}
    )
    failures: list[str] = field(default_factory=list)


def _records(df: pd.DataFrame) -> list[dict]:
    """DataFrame rows as plain Python values: pandas NA becomes None, numpy ints become ints."""
    records = []
    for row in df.to_dict("records"):
        clean = {}
        for key, value in row.items():
            if pd.isna(value):
                clean[key] = None
            elif hasattr(value, "item"):
                clean[key] = value.item()
            else:
                clean[key] = value
        records.append(clean)
    return records


def _execute_many(conn, statement, df: pd.DataFrame) -> None:
    if not df.empty:
        conn.execute(statement, _records(df))


def ingest_competitions(engine: Engine, client: FootballDataClient, codes: list[str]) -> int:
    """Upsert the requested competitions. Returns the number written."""
    init_schema(engine)
    listed = {item["code"]: item for item in client.get_competitions()}
    unknown = [code for code in codes if code not in listed]
    if unknown:
        raise ValueError(f"Unknown competition code: {unknown[0]}")
    rows = [
        {
            "code": code,
            "name": listed[code]["name"],
            "area": (listed[code].get("area") or {}).get("name"),
        }
        for code in codes
    ]
    with engine.begin() as conn:
        conn.execute(UPSERT_COMPETITION, rows)
    return len(rows)


def ingest_teams(
    engine: Engine, client: FootballDataClient, competition: str, season: int
) -> int:
    """Upsert team profiles and squads of one competition season. Returns players written."""
    init_schema(engine)
    teams, players = clean_teams(client.get_teams(competition, season))
    with engine.begin() as conn:
        _execute_many(conn, UPSERT_TEAM_PROFILE, teams)
        _execute_many(conn, UPSERT_PLAYER, players)
    return len(players)


def ingest_scorers(
    engine: Engine, client: FootballDataClient, competition: str, season: int
) -> int:
    """Upsert the top scorers of one competition season. Returns scorer rows written."""
    init_schema(engine)
    teams, players, scorers = clean_scorers(
        client.get_scorers(competition, season), competition, season
    )
    with engine.begin() as conn:
        _execute_many(conn, UPSERT_TEAM, teams)
        _execute_many(conn, UPSERT_SCORER_PLAYER, players)
        _execute_many(conn, UPSERT_SCORER, scorers)
    return len(scorers)


def ingest(
    engine: Engine, client: FootballDataClient, competition: str, season: int
) -> int:
    """Download one competition season and upsert it. Returns the number of matches written."""
    init_schema(engine)
    teams, matches = clean_matches(client.get_matches(competition, season), competition, season)
    with engine.begin() as conn:
        _execute_many(conn, UPSERT_TEAM, teams)
        _execute_many(conn, UPSERT_MATCH, matches)
    return len(matches)


def run(
    engine: Engine,
    client: FootballDataClient,
    competitions: list[str],
    seasons: list[int],
    what: tuple[str, ...] = STEPS,
) -> RunReport:
    """Ingest the chosen steps for every competition and season, oldest season first.

    Ascending seasons mean the most recent squad is written last and wins.
    An ApiAccessError is recorded in the report and the run goes on.
    """
    report = RunReport()
    report.written["competitions"] = ingest_competitions(engine, client, competitions)
    print(f"Competitions: {report.written['competitions']} written", flush=True)
    actions = {"teams": ingest_teams, "matches": ingest, "scorers": ingest_scorers}
    counted = {"teams": "players", "matches": "matches", "scorers": "scorers"}
    for season in sorted(seasons):
        for competition in competitions:
            for step in STEPS:
                if step not in what:
                    continue
                try:
                    written = actions[step](engine, client, competition, season)
                except ApiAccessError as error:
                    report.failures.append(f"{competition} {season} {step}: {error}")
                    print(f"{competition} {season} {step}: FAILED ({error})", flush=True)
                    continue
                report.written[counted[step]] += written
                print(f"{competition} {season} {step}: {written} {counted[step]}", flush=True)
    return report


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Download football-data.org data into PostgreSQL")
    parser.add_argument(
        "--competitions", default="PD", help="comma-separated codes, e.g. PD,PL (default PD)"
    )
    parser.add_argument(
        "--seasons", required=True, help="comma-separated season start years, e.g. 2024,2025"
    )
    parser.add_argument(
        "--what",
        default=",".join(STEPS),
        help="comma-separated steps: teams, matches, scorers (default all)",
    )
    args = parser.parse_args(argv)
    try:
        seasons = [int(item) for item in _csv(args.seasons)]
    except ValueError:
        parser.error("--seasons must be comma-separated integers, e.g. 2024,2025")
    what = tuple(_csv(args.what))
    unknown_steps = [step for step in what if step not in STEPS]
    if unknown_steps:
        parser.error(f"--what accepts only {', '.join(STEPS)} (got {unknown_steps[0]})")

    try:
        settings = load_settings()
        report = run(
            get_engine(settings.database_url),
            FootballDataClient(settings.football_api_key),
            _csv(args.competitions),
            seasons,
            what,
        )
    except (ConfigError, ApiAuthError, ApiAccessError, ApiRateLimitError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except requests.RequestException as error:
        print(f"Error: could not reach football-data.org ({error}).", file=sys.stderr)
        return 1
    except OperationalError:
        print(
            "Error: could not connect to PostgreSQL. Is it running (docker compose up -d)?",
            file=sys.stderr,
        )
        return 1
    print("Wrote " + ", ".join(f"{count} {name}" for name, count in report.written.items()))
    for failure in report.failures:
        print(f"Failed: {failure}", file=sys.stderr)
    return 1 if report.failures else 0


if __name__ == "__main__":
    sys.exit(main())
