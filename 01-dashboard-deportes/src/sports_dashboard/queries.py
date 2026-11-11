import numpy as np
import pandas as pd
from sqlalchemy import Engine, text

# Matches that count as played: AWARDED ones were decided off the pitch but carry an awarded score.
# Fixed text, never user input, so building the SQL from it is safe.
COUNTED_STATUSES = ("FINISHED", "AWARDED")
COUNTED = ", ".join(f"'{s}'" for s in COUNTED_STATUSES)

STANDINGS_SQL = text(
    f"""
    WITH played AS (
        SELECT home_team_id AS team_id, home_goals AS gf, away_goals AS ga
        FROM matches
        WHERE competition = :competition AND season = :season AND status IN ({COUNTED})
        UNION ALL
        SELECT away_team_id, away_goals, home_goals
        FROM matches
        WHERE competition = :competition AND season = :season AND status IN ({COUNTED})
    )
    SELECT
        t.name AS team,
        count(*)::int AS played,
        (count(*) FILTER (WHERE p.gf > p.ga))::int AS won,
        (count(*) FILTER (WHERE p.gf = p.ga))::int AS drawn,
        (count(*) FILTER (WHERE p.gf < p.ga))::int AS lost,
        sum(p.gf)::int AS gf,
        sum(p.ga)::int AS ga,
        (sum(p.gf) - sum(p.ga))::int AS gd,
        (3 * count(*) FILTER (WHERE p.gf > p.ga)
            + count(*) FILTER (WHERE p.gf = p.ga))::int AS points
    FROM played p
    JOIN teams t ON t.id = p.team_id
    GROUP BY t.name
    ORDER BY points DESC, gd DESC, gf DESC, team
    """
)

TEAM_RESULTS_SQL = text(
    f"""
    SELECT m.matchday, m.utc_date, o.name AS opponent, TRUE AS home,
           m.home_goals AS goals_for, m.away_goals AS goals_against
    FROM matches m
    JOIN teams o ON o.id = m.away_team_id
    WHERE m.competition = :competition AND m.season = :season
      AND m.status IN ({COUNTED}) AND m.home_team_id = :team_id
    UNION ALL
    SELECT m.matchday, m.utc_date, o.name, FALSE, m.away_goals, m.home_goals
    FROM matches m
    JOIN teams o ON o.id = m.home_team_id
    WHERE m.competition = :competition AND m.season = :season
      AND m.status IN ({COUNTED}) AND m.away_team_id = :team_id
    ORDER BY utc_date
    """
)

LIST_TEAMS_SQL = text(
    """
    SELECT DISTINCT t.id, t.name
    FROM teams t
    JOIN matches m ON t.id IN (m.home_team_id, m.away_team_id)
    WHERE m.competition = :competition AND m.season = :season
    ORDER BY t.name
    """
)

SEASON_MATCHES_SQL = text(
    """
    SELECT m.matchday, m.utc_date, h.name AS home, a.name AS away,
           m.home_goals, m.away_goals, m.status
    FROM matches m
    JOIN teams h ON h.id = m.home_team_id
    JOIN teams a ON a.id = m.away_team_id
    WHERE m.competition = :competition AND m.season = :season
    ORDER BY m.matchday, m.utc_date
    """
)

AVAILABLE_SEASONS_SQL = text(
    "SELECT DISTINCT competition, season FROM matches ORDER BY competition, season DESC"
)


def _read(engine: Engine, sql, **params) -> pd.DataFrame:
    return pd.read_sql(sql, engine, params=params)


def standings(engine: Engine, competition: str, season: int) -> pd.DataFrame:
    """League table built from FINISHED and AWARDED matches only: win 3, draw 1, loss 0."""
    return _read(engine, STANDINGS_SQL, competition=competition, season=season)


def team_results(engine: Engine, competition: str, season: int, team_id: int) -> pd.DataFrame:
    """One row per counted (finished or awarded) match of the team, with result and cumulative points."""
    df = _read(
        engine, TEAM_RESULTS_SQL, competition=competition, season=season, team_id=team_id
    )
    df["result"] = np.where(
        df["goals_for"] > df["goals_against"],
        "W",
        np.where(df["goals_for"] == df["goals_against"], "D", "L"),
    )
    df["points"] = df["result"].map({"W": 3, "D": 1, "L": 0}).astype(int)
    df["cumulative_points"] = df["points"].cumsum()
    return df


def list_teams(engine: Engine, competition: str, season: int) -> pd.DataFrame:
    return _read(engine, LIST_TEAMS_SQL, competition=competition, season=season)


def season_matches(engine: Engine, competition: str, season: int) -> pd.DataFrame:
    return _read(engine, SEASON_MATCHES_SQL, competition=competition, season=season)


def available_seasons(engine: Engine) -> pd.DataFrame:
    return _read(engine, AVAILABLE_SEASONS_SQL)
