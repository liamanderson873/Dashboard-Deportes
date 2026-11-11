import copy
import json
from pathlib import Path

import pytest
from sqlalchemy import text

from sports_dashboard.client import ApiAccessError
from sports_dashboard.ingest import (
    RunReport,
    ingest,
    ingest_competitions,
    ingest_scorers,
    ingest_teams,
    run,
)

FIXTURES = Path(__file__).parent / "fixtures"


def load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


SAMPLE = load("matches_sample.json")
TEAMS_SAMPLE = load("teams_sample.json")
SCORERS_SAMPLE = load("scorers_sample.json")
COMPETITIONS_SAMPLE = [
    {"code": "PD", "name": "Primera Division", "area": {"name": "Spain"}},
    {"code": "FL1", "name": "Ligue 1", "area": {"name": "France"}},
    {"code": "PL", "name": "Premier League", "area": {"name": "England"}},
]


class FakeClient:
    def __init__(self, matches=SAMPLE, teams=TEAMS_SAMPLE, scorers=SCORERS_SAMPLE):
        self.matches = matches
        self.teams = teams
        self.scorers = scorers
        self.calls = []

    def get_competitions(self):
        return COMPETITIONS_SAMPLE

    def get_matches(self, competition, season):
        self.calls.append(("matches", competition, season))
        return self.matches

    def get_teams(self, competition, season):
        self.calls.append(("teams", competition, season))
        return self.teams

    def get_scorers(self, competition, season, limit=100):
        self.calls.append(("scorers", competition, season))
        return self.scorers


def count(engine, table):
    with engine.connect() as conn:
        return conn.execute(text(f"SELECT count(*) FROM {table}")).scalar_one()


def test_ingest_returns_number_of_matches_written(engine):
    written = ingest(engine, FakeClient(), "PD", 2024)

    assert written == 2
    assert count(engine, "matches") == 2
    assert count(engine, "teams") == 3


def test_ingest_twice_does_not_duplicate_rows(engine):
    client = FakeClient()

    ingest(engine, client, "PD", 2024)
    ingest(engine, client, "PD", 2024)

    assert count(engine, "matches") == 2
    assert count(engine, "teams") == 3


def test_ingest_updates_score_when_match_gets_played(engine):
    ingest(engine, FakeClient(), "PD", 2024)
    played = copy.deepcopy(SAMPLE)
    played[1]["status"] = "FINISHED"
    played[1]["score"]["fullTime"] = {"home": 1, "away": 0}

    ingest(engine, FakeClient(matches=played), "PD", 2024)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT status, home_goals, away_goals FROM matches WHERE id = 2")
        ).one()
    assert tuple(row) == ("FINISHED", 1, 0)
    assert count(engine, "matches") == 2


def test_ingest_writes_half_time_goals(engine):
    ingest(engine, FakeClient(), "PD", 2024)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT home_ht_goals, away_ht_goals FROM matches WHERE id = 1")
        ).one()
    assert tuple(row) == (1, 0)


def test_ingest_teams_enriches_profile_and_stores_squad(engine):
    client = FakeClient()
    ingest(engine, client, "PD", 2024)

    written = ingest_teams(engine, client, "PD", 2024)

    assert written == 2
    with engine.connect() as conn:
        row = conn.execute(text("SELECT coach, crest FROM teams WHERE id = 86")).one()
        players = conn.execute(text("SELECT id FROM players ORDER BY id")).scalars().all()
    assert tuple(row) == ("Carlo Ancelotti", "https://crests.football-data.org/86.png")
    assert players == [3001, 3002]


def test_ingest_teams_with_empty_squad_and_null_coach_succeeds(engine):
    client = FakeClient(teams=[TEAMS_SAMPLE[1]])

    written = ingest_teams(engine, client, "PD", 2024)

    assert written == 0
    with engine.connect() as conn:
        coach = conn.execute(text("SELECT coach FROM teams WHERE id = 81")).scalar_one()
    assert coach is None
    assert count(engine, "players") == 0


def squad_rows(engine):
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT season, team_id, player_id FROM squad_members ORDER BY 1, 2, 3")
        ).all()
    return [tuple(row) for row in rows]


def teams_with_squad(player_ids):
    """Copy of the teams sample where team 86 has exactly the given players."""
    teams = copy.deepcopy(TEAMS_SAMPLE)
    template = teams[0]["squad"][0]
    teams[0]["squad"] = [{**template, "id": pid, "name": f"Player {pid}"} for pid in player_ids]
    return teams


def test_ingest_teams_writes_squad_members_per_season(engine):
    ingest_teams(engine, FakeClient(), "PD", 2024)
    ingest_teams(engine, FakeClient(), "PD", 2025)

    assert squad_rows(engine) == [
        (2024, 86, 3001),
        (2024, 86, 3002),
        (2025, 86, 3001),
        (2025, 86, 3002),
    ]


def test_ingest_teams_replaces_a_teams_squad_for_the_season(engine):
    ingest_teams(engine, FakeClient(), "PD", 2024)
    ingest_teams(engine, FakeClient(), "PD", 2025)

    ingest_teams(engine, FakeClient(teams=teams_with_squad([3001, 3003])), "PD", 2024)

    assert squad_rows(engine) == [
        (2024, 86, 3001),
        (2024, 86, 3003),
        (2025, 86, 3001),
        (2025, 86, 3002),
    ]


def test_ingest_teams_squad_members_are_idempotent(engine):
    ingest_teams(engine, FakeClient(), "PD", 2024)
    first = squad_rows(engine)

    ingest_teams(engine, FakeClient(), "PD", 2024)

    assert squad_rows(engine) == first == [(2024, 86, 3001), (2024, 86, 3002)]


def test_ingest_teams_empties_the_squad_when_the_team_now_has_no_players(engine):
    ingest_teams(engine, FakeClient(), "PD", 2024)

    ingest_teams(engine, FakeClient(teams=teams_with_squad([])), "PD", 2024)

    assert squad_rows(engine) == []


def test_ingesting_matches_after_teams_keeps_the_profile(engine):
    client = FakeClient()
    ingest_teams(engine, client, "PD", 2024)

    ingest(engine, client, "PD", 2024)

    with engine.connect() as conn:
        coach = conn.execute(text("SELECT coach FROM teams WHERE id = 86")).scalar_one()
    assert coach == "Carlo Ancelotti"


def test_ingest_scorers_inserts_missing_team_and_player_first(engine):
    written = ingest_scorers(engine, FakeClient(), "PD", 2024)

    assert written == 2
    assert count(engine, "scorers") == 2
    assert count(engine, "players") == 2
    assert count(engine, "teams") == 2


def test_ingest_scorers_twice_does_not_duplicate_rows(engine):
    client = FakeClient()

    ingest_scorers(engine, client, "PD", 2024)
    ingest_scorers(engine, client, "PD", 2024)

    assert count(engine, "scorers") == 2
    assert count(engine, "players") == 2


def scorer(player_id, name, team_id, team_name, position=None):
    return {
        "player": {
            "id": player_id,
            "name": name,
            "position": position,
            "nationality": None,
            "dateOfBirth": None,
        },
        "team": {"id": team_id, "name": team_name},
        "playedMatches": 10,
        "goals": 7,
        "assists": 1,
        "penalties": 0,
    }


def test_ingest_scorers_after_teams_keeps_squad_position_team_and_birth_date(engine):
    ingest_teams(engine, FakeClient(), "PD", 2024)
    scorers = [scorer(3001, "Thibaut Courtois", 81, "FC Barcelona")]

    ingest_scorers(engine, FakeClient(scorers=scorers), "PD", 2024)

    with engine.connect() as conn:
        player = conn.execute(
            text("SELECT position, team_id, date_of_birth, nationality FROM players WHERE id = 3001")
        ).one()
        scorer_team = conn.execute(
            text("SELECT team_id FROM scorers WHERE player_id = 3001")
        ).scalar_one()
    assert player.position == "Goalkeeper"
    assert player.team_id == 86
    assert str(player.date_of_birth) == "1992-05-11"
    assert player.nationality == "Belgium"
    assert scorer_team == 81


def test_ingest_scorers_for_a_new_player_stores_the_scorer_team(engine):
    scorers = [scorer(9001, "New Striker", 81, "FC Barcelona", position="Offence")]

    ingest_scorers(engine, FakeClient(scorers=scorers), "PD", 2024)

    with engine.connect() as conn:
        row = conn.execute(text("SELECT team_id, position FROM players WHERE id = 9001")).one()
    assert tuple(row) == (81, "Offence")


def test_ingest_competitions_upserts_only_requested_codes(engine):
    written = ingest_competitions(engine, FakeClient(), ["PD", "FL1"])

    assert written == 2
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT code, name, area FROM competitions ORDER BY code")).all()
    assert [tuple(r) for r in rows] == [
        ("FL1", "Ligue 1", "France"),
        ("PD", "Primera Division", "Spain"),
    ]


def test_ingest_competitions_unknown_code_raises_value_error(engine):
    with pytest.raises(ValueError, match="Unknown competition code: XX"):
        ingest_competitions(engine, FakeClient(), ["PD", "XX"])


class FailingFl1Client(FakeClient):
    def get_matches(self, competition, season):
        if competition == "FL1":
            raise ApiAccessError("FL1 is not in your plan")
        return super().get_matches(competition, season)


def test_run_continues_after_an_api_access_error_and_reports_it(engine):
    report = run(engine, FailingFl1Client(), ["FL1", "PD"], [2024], what=("matches",))

    assert isinstance(report, RunReport)
    assert report.written["matches"] == 2
    assert report.written["competitions"] == 2
    assert len(report.failures) == 1
    assert "FL1" in report.failures[0]
    assert "2024" in report.failures[0]
    assert "matches" in report.failures[0]
    assert count(engine, "matches") == 2


def test_run_processes_seasons_in_ascending_order_and_steps_in_order(engine):
    client = FakeClient()

    run(engine, client, ["PD"], [2026, 2024, 2025])

    assert client.calls == [
        (step, "PD", season)
        for season in (2024, 2025, 2026)
        for step in ("teams", "matches", "scorers")
    ]


def test_run_only_runs_requested_steps(engine):
    client = FakeClient()

    report = run(engine, client, ["PD"], [2024], what=("scorers",))

    assert client.calls == [("scorers", "PD", 2024)]
    assert report.written == {"competitions": 1, "matches": 0, "players": 0, "scorers": 2}
    assert report.failures == []
