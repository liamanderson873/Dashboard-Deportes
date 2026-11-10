import copy
import json
from pathlib import Path

from sqlalchemy import text

from sports_dashboard.ingest import ingest

SAMPLE = json.loads(
    (Path(__file__).parent / "fixtures" / "matches_sample.json").read_text(encoding="utf-8")
)


class FakeClient:
    def __init__(self, matches):
        self.matches = matches
        self.calls = []

    def get_matches(self, competition, season):
        self.calls.append((competition, season))
        return self.matches


def count(engine, table):
    with engine.connect() as conn:
        return conn.execute(text(f"SELECT count(*) FROM {table}")).scalar_one()


def test_ingest_returns_number_of_matches_written(engine):
    written = ingest(engine, FakeClient(SAMPLE), "PD", 2024)

    assert written == 2
    assert count(engine, "matches") == 2
    assert count(engine, "teams") == 3


def test_ingest_twice_does_not_duplicate_rows(engine):
    client = FakeClient(SAMPLE)

    ingest(engine, client, "PD", 2024)
    ingest(engine, client, "PD", 2024)

    assert count(engine, "matches") == 2
    assert count(engine, "teams") == 3


def test_ingest_updates_score_when_match_gets_played(engine):
    ingest(engine, FakeClient(SAMPLE), "PD", 2024)
    played = copy.deepcopy(SAMPLE)
    played[1]["status"] = "FINISHED"
    played[1]["score"]["fullTime"] = {"home": 1, "away": 0}

    ingest(engine, FakeClient(played), "PD", 2024)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT status, home_goals, away_goals FROM matches WHERE id = 2")
        ).one()
    assert tuple(row) == ("FINISHED", 1, 0)
    assert count(engine, "matches") == 2
