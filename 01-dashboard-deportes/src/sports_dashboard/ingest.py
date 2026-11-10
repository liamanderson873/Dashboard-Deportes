import argparse

import pandas as pd
from sqlalchemy import Engine, text

from sports_dashboard.client import FootballDataClient
from sports_dashboard.config import load_settings
from sports_dashboard.db import get_engine, init_schema
from sports_dashboard.transform import clean_matches

UPSERT_TEAM = text(
    "INSERT INTO teams (id, name) VALUES (:id, :name) "
    "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name"
)

UPSERT_MATCH = text(
    "INSERT INTO matches (id, competition, season, matchday, utc_date, status, "
    "home_team_id, away_team_id, home_goals, away_goals) "
    "VALUES (:id, :competition, :season, :matchday, :utc_date, :status, "
    ":home_team_id, :away_team_id, :home_goals, :away_goals) "
    "ON CONFLICT (id) DO UPDATE SET "
    "competition = EXCLUDED.competition, season = EXCLUDED.season, "
    "matchday = EXCLUDED.matchday, utc_date = EXCLUDED.utc_date, "
    "status = EXCLUDED.status, home_team_id = EXCLUDED.home_team_id, "
    "away_team_id = EXCLUDED.away_team_id, home_goals = EXCLUDED.home_goals, "
    "away_goals = EXCLUDED.away_goals"
)


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


def ingest(
    engine: Engine, client: FootballDataClient, competition: str, season: int
) -> int:
    """Download one competition season and upsert it. Returns the number of matches written."""
    init_schema(engine)
    teams, matches = clean_matches(client.get_matches(competition, season), competition, season)
    with engine.begin() as conn:
        if not teams.empty:
            conn.execute(UPSERT_TEAM, _records(teams))
        if not matches.empty:
            conn.execute(UPSERT_MATCH, _records(matches))
    return len(matches)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download football-data.org matches into PostgreSQL")
    parser.add_argument("--competition", default="PD", help="competition code, e.g. PD or PL")
    parser.add_argument("--season", type=int, required=True, help="season start year, e.g. 2024")
    args = parser.parse_args()

    settings = load_settings()
    written = ingest(
        get_engine(settings.database_url),
        FootballDataClient(settings.football_api_key),
        args.competition,
        args.season,
    )
    print(f"Wrote {written} matches for {args.competition} {args.season}")


if __name__ == "__main__":
    main()
