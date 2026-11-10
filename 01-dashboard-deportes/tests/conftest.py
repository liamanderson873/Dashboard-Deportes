import os

import pytest
from sqlalchemy import text

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://sports:sports@localhost:5433/sports_test"
)


@pytest.fixture
def engine():
    from sports_dashboard.db import get_engine

    eng = get_engine(TEST_DATABASE_URL)
    with eng.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS matches, teams CASCADE"))
    yield eng
    eng.dispose()
