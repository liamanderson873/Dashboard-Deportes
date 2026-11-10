import json
from pathlib import Path

import pandas as pd
import pytest

from sports_dashboard.transform import clean_matches

SAMPLE = Path(__file__).parent / "fixtures" / "matches_sample.json"


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
