import os

import pytest
from sqlalchemy import text

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://sports:sports@127.0.0.1:5433/sports_test"
)


@pytest.fixture
def engine():
    from sports_dashboard.db import get_engine

    eng = get_engine(TEST_DATABASE_URL)
    with eng.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS match_stats, scorers, squad_members, players, competitions, matches, teams CASCADE"))
    yield eng
    eng.dispose()


TEAMS = [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}, {"id": 3, "name": "C"}]

# id, matchday, date, status, home, away, home_goals, away_goals
MATCHES = [
    (1, 1, "2024-08-15T19:00:00Z", "FINISHED", 1, 2, 2, 1),
    (2, 2, "2024-08-22T19:00:00Z", "FINISHED", 2, 3, 1, 1),
    (3, 3, "2024-08-29T19:00:00Z", "FINISHED", 3, 1, 0, 3),
    (4, 4, "2024-09-05T19:00:00Z", "SCHEDULED", 1, 2, None, None),
]


@pytest.fixture
def seeded(engine):
    from sports_dashboard.db import init_schema

    init_schema(engine)
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO teams (id, name) VALUES (:id, :name)"), TEAMS)
        conn.execute(
            text(
                "INSERT INTO matches (id, competition, season, matchday, utc_date, status, "
                "home_team_id, away_team_id, home_goals, away_goals) VALUES "
                "(:id, 'PD', 2024, :md, :d, :st, :h, :a, :hg, :ag)"
            ),
            [
                {"id": i, "md": md, "d": d, "st": st, "h": h, "a": a, "hg": hg, "ag": ag}
                for i, md, d, st, h, a, hg, ag in MATCHES
            ],
        )
    return engine
