import pandas as pd

from sports_dashboard.summary import season_summary

TABLE = pd.DataFrame(
    [
        {"team": "A", "played": 2, "gf": 5, "ga": 1, "points": 6},
        {"team": "B", "played": 2, "gf": 2, "ga": 3, "points": 1},
        {"team": "C", "played": 2, "gf": 1, "ga": 4, "points": 1},
    ]
)


def test_summary_picks_leader_best_attack_and_best_defense():
    summary = season_summary(TABLE)

    assert summary["leader"] == "A"
    assert summary["leader_points"] == 6
    assert (summary["best_attack"], summary["best_attack_goals"]) == ("A", 5)
    assert (summary["best_defense"], summary["best_defense_goals"]) == ("A", 1)


def test_summary_counts_each_match_once_for_goals_per_match():
    summary = season_summary(TABLE)

    assert summary["matches_played"] == 3
    assert summary["goals_per_match"] == 2.67


def test_summary_of_empty_table_is_none():
    assert season_summary(TABLE.iloc[0:0]) is None
