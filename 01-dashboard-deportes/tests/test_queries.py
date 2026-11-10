from sports_dashboard.db import init_schema
from sports_dashboard.queries import (
    available_seasons,
    list_teams,
    season_matches,
    standings,
    team_results,
)

def test_standings_points_and_order(seeded):
    table = standings(seeded, "PD", 2024)

    assert list(table["team"]) == ["A", "B", "C"]
    assert list(table["points"]) == [6, 1, 1]
    assert list(table["gd"]) == [4, -1, -3]
    assert list(table[["won", "drawn", "lost"]].iloc[0]) == [2, 0, 0]


def test_standings_ignores_unplayed_matches(seeded):
    table = standings(seeded, "PD", 2024)

    assert list(table["played"]) == [2, 2, 2]


def test_standings_empty_when_no_data(engine):
    init_schema(engine)

    table = standings(engine, "PD", 2024)

    assert table.empty
    assert "points" in table.columns


def test_team_results_with_cumulative_points(seeded):
    results = team_results(seeded, "PD", 2024, 1)

    assert list(results["result"]) == ["W", "W"]
    assert list(results["cumulative_points"]) == [3, 6]
    assert list(results["opponent"]) == ["B", "C"]


def test_team_results_empty_for_unknown_team(seeded):
    assert team_results(seeded, "PD", 2024, 999).empty


def test_list_teams_sorted_by_name(seeded):
    assert list(list_teams(seeded, "PD", 2024)["name"]) == ["A", "B", "C"]


def test_season_matches_includes_scheduled_in_order(seeded):
    matches = season_matches(seeded, "PD", 2024)

    assert list(matches["matchday"]) == [1, 2, 3, 4]
    assert matches.iloc[3]["status"] == "SCHEDULED"


def test_available_seasons(seeded, engine):
    seasons = available_seasons(engine)

    assert [tuple(r) for r in seasons[["competition", "season"]].to_numpy()] == [("PD", 2024)]


def test_available_seasons_empty_when_no_data(engine):
    init_schema(engine)

    assert available_seasons(engine).empty
