import datetime
import json
from pathlib import Path

import pandas as pd
import pytest

from sports_dashboard.transform import clean_matches, clean_scorers, clean_teams

FIXTURES = Path(__file__).parent / "fixtures"
SAMPLE = FIXTURES / "matches_sample.json"


def _load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture
def cleaned():
    raw = json.loads(SAMPLE.read_text(encoding="utf-8"))
    return clean_matches(raw, "PD", 2024)


def test_played_match_has_goals(cleaned):
    _, matches = cleaned
    row = matches[matches["id"] == 1].iloc[0]

    assert row["home_goals"] == 2
    assert row["away_goals"] == 1
    assert row["competition"] == "PD"
    assert row["season"] == 2024


def test_scheduled_match_has_null_goals_and_status(cleaned):
    _, matches = cleaned
    row = matches[matches["id"] == 2].iloc[0]

    assert pd.isna(row["home_goals"])
    assert pd.isna(row["away_goals"])
    assert row["status"] == "SCHEDULED"


def test_teams_are_unique(cleaned):
    teams, _ = cleaned

    assert sorted(teams["id"]) == [78, 81, 86]


def test_utc_date_is_timezone_aware(cleaned):
    _, matches = cleaned

    assert str(matches["utc_date"].dt.tz) == "UTC"


def test_matches_without_team_ids_are_dropped(cleaned):
    _, matches = cleaned

    assert sorted(matches["id"]) == [1, 2]


def test_empty_input_returns_empty_frames_with_columns():
    teams, matches = clean_matches([], "PD", 2024)

    assert teams.empty and matches.empty
    assert "home_goals" in matches.columns


def test_clean_matches_reads_half_time_goals(cleaned):
    _, matches = cleaned
    played = matches[matches["id"] == 1].iloc[0]
    scheduled = matches[matches["id"] == 2].iloc[0]

    assert played["home_ht_goals"] == 1
    assert played["away_ht_goals"] == 0
    assert pd.isna(scheduled["home_ht_goals"])
    assert pd.isna(scheduled["away_ht_goals"])


def test_clean_teams_extracts_profile_and_squad():
    teams, players = clean_teams(_load("teams_sample.json"))

    assert list(teams.columns) == [
        "id", "name", "short_name", "tla", "crest", "founded",
        "venue", "club_colors", "website", "coach",
    ]
    madrid = teams[teams["id"] == 86].iloc[0]
    assert madrid["short_name"] == "Real Madrid"
    assert madrid["tla"] == "RMA"
    assert madrid["crest"] == "https://crests.football-data.org/86.png"
    assert madrid["founded"] == 1902
    assert madrid["coach"] == "Carlo Ancelotti"

    assert list(players.columns) == [
        "id", "team_id", "name", "position", "nationality", "date_of_birth",
    ]
    assert sorted(players["id"]) == [3001, 3002]
    assert set(players["team_id"]) == {86}
    courtois = players[players["id"] == 3001].iloc[0]
    assert courtois["name"] == "Thibaut Courtois"
    assert courtois["position"] == "Goalkeeper"
    assert courtois["nationality"] == "Belgium"


def test_clean_teams_tolerates_missing_squad_coach_and_crest():
    teams, players = clean_teams(_load("teams_sample.json"))
    barca = teams[teams["id"] == 81].iloc[0]

    assert pd.isna(barca["coach"])
    assert pd.isna(barca["crest"])
    assert (players["team_id"] == 81).sum() == 0


def test_clean_teams_parses_birth_date_as_date():
    _, players = clean_teams(_load("teams_sample.json"))
    row = players[players["id"] == 3001].iloc[0]

    assert row["date_of_birth"] == datetime.date(1992, 5, 11)


def test_clean_scorers_returns_scorer_rows_with_competition_and_season():
    teams, players, scorers = clean_scorers(_load("scorers_sample.json"), "PD", 2024)

    assert list(scorers.columns) == [
        "competition", "season", "player_id", "team_id",
        "goals", "assists", "penalties", "played_matches",
    ]
    row = scorers[scorers["player_id"] == 3010].iloc[0]
    assert row["competition"] == "PD"
    assert row["season"] == 2024
    assert row["team_id"] == 86
    assert row["goals"] == 27
    assert row["assists"] == 3
    assert row["penalties"] == 5
    assert row["played_matches"] == 30
    assert list(teams.columns) == ["id", "name"]
    assert sorted(teams["id"]) == [81, 86]
    assert sorted(players["id"]) == [3010, 3011]


def test_clean_scorers_keeps_null_assists_as_null():
    _, _, scorers = clean_scorers(_load("scorers_sample.json"), "PD", 2024)
    row = scorers[scorers["player_id"] == 3011].iloc[0]

    assert pd.isna(row["assists"])
    assert row["goals"] == 25
