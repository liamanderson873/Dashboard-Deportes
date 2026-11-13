import json
from io import BytesIO

import numpy as np
import pandas as pd
import pytest
import responses
from sqlalchemy import text

from sports_dashboard.nba.features import FEATURES, STRENGTH, build_games, with_schedule
from sports_dashboard.nba.ingest import init_schema, stats_snapshot, write_rows
from sports_dashboard.nba.models import evaluate, fit_temporal
from sports_dashboard.nba.shots import (
    SHOT_FEATURES,
    clock_seconds,
    normalize_shots,
    shot_features,
)
from sports_dashboard.nba.source import (
    SourceError,
    archive_url,
    load_frame,
    validate_frame,
)


def logs():
    output = []
    for game in range(10):
        for team in [1, 2]:
            home = game % 2 + 1
            points = 110 if team == (game % 2 + 1) else 100
            output.append(
                {
                    "season": 2020,
                    "team_id": team,
                    "game_id": f"00219000{game:02}",
                    "game_date": f"2019-10-{game + 1:02}",
                    "matchup": f"{team} vs. X" if team == home else f"{team} @ X",
                    "pts": points,
                    "fga": 85,
                    "fta": 20,
                    "oreb": 10,
                    "dreb": 35,
                    "tov": 12,
                    "fgm": 40,
                    "fg3m": 10,
                    "min": 240,
                }
            )
    return pd.DataFrame(output)


def test_archive_years_use_end_year_and_reject_arbitrary_sources():
    assert archive_url("shots", 2026).endswith("shots_2027.parquet")
    with pytest.raises(ValueError):
        archive_url("../../secret", 2026)
    with pytest.raises(ValueError):
        archive_url("shots", 1990)


def test_wrong_source_season_or_missing_schema_rejected():
    with pytest.raises(SourceError):
        validate_frame(
            "shots", 2026, pd.DataFrame({"game_id": ["1"], "season": [2026]})
        )
    with pytest.raises(SourceError):
        validate_frame("shots", 2026, pd.DataFrame({"season": [2027]}))


@responses.activate
def test_cached_download_is_validated_and_network_is_not_repeated(tmp_path):
    frame = pd.DataFrame({"game_id": ["0022600001"], "season": [2027]})
    stream = BytesIO()
    frame.to_parquet(stream, index=False)
    responses.get(archive_url("shots", 2026), body=stream.getvalue(), status=200)
    first, metadata = load_frame("shots", 2026, cache=tmp_path)
    second, _ = load_frame("shots", 2026, cache=tmp_path)
    assert len(responses.calls) == 1 and len(metadata["sha256"]) == 64
    pd.testing.assert_frame_equal(first, second)


@responses.activate
def test_error_page_never_replaces_a_valid_cache(tmp_path):
    path = tmp_path / "shots_2027.parquet"
    path.write_bytes(b"original")
    responses.get(archive_url("shots", 2026), body="<html>denied</html>", status=200)
    with pytest.raises(SourceError):
        load_frame("shots", 2026, True, tmp_path)
    assert path.read_bytes() == b"original"


def test_pregame_features_do_not_include_current_or_future_results():
    original, _ = build_games(logs(), minimum_games=1)
    changed = logs()
    changed.loc[changed.game_id.eq("0021900009") & changed.team_id.eq(1), "pts"] += 100
    actual, _ = build_games(changed, minimum_games=1)
    pd.testing.assert_frame_equal(original[FEATURES], actual[FEATURES])
    assert original.iloc[0].rest_diff == 0


def test_incomplete_or_duplicate_game_is_rejected():
    with pytest.raises(ValueError):
        build_games(logs().iloc[1:])
    with pytest.raises(ValueError):
        build_games(pd.concat([logs(), logs().head(1)]))


def test_bubble_home_advantage_is_removed():
    frame = logs()
    frame.game_date = pd.date_range("2020-08-01", periods=10).repeat(2).astype(str)
    games, _ = build_games(frame, 1)
    assert games.home_advantage.eq(0).all()


def test_schedule_ids_resolve_neutral_venue_matchup_strings():
    frame = logs()
    frame["matchup"] = frame.matchup.str.replace(" vs. ", " @ ", regex=False)
    schedule = pd.DataFrame(
        [
            {
                "game_id": f"00219000{i:02}",
                "home_team_id": i % 2 + 1,
                "away_team_id": 2 - i % 2,
            }
            for i in range(10)
        ]
    )
    result, _ = build_games(with_schedule(frame, schedule), 1)
    assert len(result) == 9 and result.home_advantage.eq(0).all()


def test_probability_calibration_counts_each_observation_once():
    report = evaluate([0, 0, 1, 1], [0.1, 0.2, 0.5, 0.9])
    assert sum(b["n"] for b in report["calibration"]) == 4
    assert 0 <= report["brier"] <= 1


def test_temporal_training_keeps_latest_season_out_of_fit():
    data = pd.DataFrame(
        [
            {"season": year, "x": i + (10000 if year == 2025 else 0), "target": i % 2}
            for year in [2023, 2024, 2025]
            for i in range(12)
        ]
    )
    _, report, evaluated, test = fit_temporal(data, ["x"])
    assert report["test_season"] == 2025 and test.season.eq(2025).all()
    assert report["validation_season"] == 2024
    assert report["production_refit_seasons"] == [2023, 2024, 2025]
    assert evaluated.named_steps["standardscaler"].mean_[0] == pytest.approx(5.5)
    with pytest.raises(ValueError):
        fit_temporal(data[data.season > 2023], ["x"])


def shot_frame():
    return pd.DataFrame(
        {
            "game_id": ["0022600001"] * 2,
            "season": [2027] * 2,
            "person_id": [1, 1],
            "team_id": [2, 2],
            "period": [1, 1],
            "clock": ["PT11M32.00S", "PT00M00.50S"],
            "shot_result": ["Made", "Missed"],
            "shot_value": [2, 3],
            "shot_distance": [1, 25],
            "x_legacy": [0, 250],
            "y_legacy": [10, 0],
        }
    )


def test_shots_keep_makes_misses_and_convert_coordinates_without_tracking():
    frame = normalize_shots(shot_frame(), 2026)
    assert frame.made.tolist() == [1, 0] and frame.x.tolist() == [0, 25]
    assert frame.seconds.tolist() == [692, 0.5]
    features = shot_features(frame)
    assert features.angle.tolist() == [0, 90]
    assert not {"shot_result", "made", "defender", "shot_clock"}.intersection(
        SHOT_FEATURES
    )
    assert "made" not in SHOT_FEATURES


def test_invalid_period_clock_and_missing_tracking_do_not_become_zero():
    with pytest.raises(ValueError):
        clock_seconds(None)
    frame = shot_frame()
    frame.loc[0, "clock"] = "PT99M00S"
    with pytest.raises(ValueError):
        normalize_shots(frame, 2026)


def test_snapshot_does_not_lose_base_values_when_advanced_is_null():
    frame = pd.DataFrame(
        [
            {
                "season_type": "regular-season",
                "per_mode": "pergame",
                "team_id": 1,
                "pts": 100,
                "off_rating": None,
            },
            {
                "season_type": "regular-season",
                "per_mode": "pergame",
                "team_id": 1,
                "pts": None,
                "off_rating": 110,
            },
        ]
    )
    result = stats_snapshot(frame, "team_id")[1]
    assert result["pts"] == 100 and result["off_rating"] == 110


def test_nba_tables_do_not_touch_football_and_json_rows_roundtrip(seeded):
    init_schema(seeded)
    with seeded.begin() as connection:
        connection.execute(text("DELETE FROM nba_models WHERE season=1900"))
        write_rows(
            connection,
            "nba_models",
            [
                {
                    "season": 1900,
                    "kind": "test",
                    "metadata": json.dumps({"missing": None}),
                    "predictions": "[]",
                }
            ],
        )
        assert connection.execute(text("SELECT count(*) FROM teams")).scalar() == 3
        assert (
            connection.execute(
                text("SELECT metadata->>'missing' FROM nba_models WHERE season=1900")
            ).scalar()
            is None
        )
        connection.execute(text("DELETE FROM nba_models WHERE season=1900"))


def test_simulation_reproducibility_probability_nesting_and_one_champion():
    from sports_dashboard.nba.simulation import simulate

    class EqualModel:
        def predict_proba(self, frame):
            return np.full((len(frame), 2), 0.5)

    teams = [
        {"id": i, "conference": "Este" if i <= 15 else "Oeste"} for i in range(1, 31)
    ]
    snapshots = {
        i: {**{k: 0 for k in STRENGTH}, "last_date": "2026-10-31"} for i in range(1, 31)
    }
    games = []
    from datetime import date, timedelta

    for round_no in range(80):
        rotation = (
            [1]
            + list(range(2, 31))[round_no % 29 :]
            + list(range(2, 31))[: round_no % 29]
        )
        for pair in range(15):
            games.append(
                {
                    "id": f"{round_no:02}-{pair:02}",
                    "game_date": str(date(2026, 11, 1) + timedelta(days=round_no)),
                    "home_id": rotation[pair],
                    "away_id": rotation[-pair - 1],
                    "home_pts": 100 if round_no < 2 else None,
                    "away_pts": 90 if round_no < 2 else None,
                    "status": "finished" if round_no < 2 else "scheduled",
                }
            )
    first, metadata = simulate(EqualModel(), snapshots, teams, games, runs=100, seed=7)
    second, _ = simulate(EqualModel(), snapshots, teams, games, runs=100, seed=7)
    assert first == second and metadata["conditional"] is True
    assert sum(r["champion"] for r in first) == pytest.approx(1)
    assert sum(r["playoffs"] for r in first) == pytest.approx(16)
    for row in first:
        assert (
            row["playoffs"]
            >= row["round2"]
            >= row["conference_final"]
            >= row["final"]
            >= row["champion"]
        )
