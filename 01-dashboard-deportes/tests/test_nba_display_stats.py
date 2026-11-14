import json

import pandas as pd
import pytest
from sqlalchemy import text

from sports_dashboard.nba import ingest


def frames():
    common = {"season_type": "regular-season", "per_mode": "pergame", "gp": 10}
    player = pd.DataFrame(
        [
            {
                **common,
                "player_id": 7,
                "measure_type": "usage",
                "min": 263,
                "pts": None,
            },
            {
                **common,
                "player_id": 7,
                "measure_type": "scoring",
                "min": 26.3,
                "fgm": 80,
                "fga": 160,
            },
            {
                **common,
                "player_id": 7,
                "measure_type": "advanced",
                "min": 26.3,
                "ts_pct": 0.719,
                "fgm": 80,
                "fga": 160,
            },
            {
                **common,
                "player_id": 7,
                "measure_type": "base",
                "min": 26.3,
                "pts": 27.8,
                "fgm": 8,
                "fga": 16,
            },
        ]
    )
    team = pd.DataFrame(
        [
            {
                **common,
                "team_id": 1,
                "measure_type": "advanced",
                "min": 581,
                "off_rating": 117.3,
            },
            {**common, "team_id": 1, "measure_type": "base", "min": 48.4, "pts": 114.3},
        ]
    )
    return {"player_season_stats": player, "team_season_stats": team}


def test_base_rates_are_order_independent_and_totals_never_replace_missing_rates():
    data = frames()["player_season_stats"]
    for frame in [data, data.iloc[::-1]]:
        row = ingest.stats_snapshot(frame, "player_id")[7]
        assert (
            row["min"] == 26.3
            and row["fgm"] == 8
            and row["fga"] == 16
            and row["ts_pct"] == 0.719
        )
    data.loc[data.measure_type == "base", ["min", "fgm", "fga"]] = None
    result = ingest.stats_snapshot(data, "player_id")[7]
    assert "min" not in result and "fgm" not in result and "fga" not in result


def seed(connection):
    for table in [
        "nba_players",
        "nba_team_stats",
        "nba_sources",
        "nba_models",
        "nba_prediction_history",
    ]:
        connection.execute(text(f"DELETE FROM {table} WHERE season=1902"))
    connection.execute(
        text(
            "INSERT INTO nba_players VALUES(1902,7,'Observed',1,'G',:metrics),(1902,8,'Roster only',1,NULL,'{\"stats_unavailable\": 1}')"
        ),
        {"metrics": json.dumps({"min": 263, "pts": 27.8})},
    )
    connection.execute(
        text("INSERT INTO nba_team_stats VALUES(1902,1,'{\"min\": 581}')")
    )
    for dataset in frames():
        connection.execute(
            text(
                "INSERT INTO nba_sources VALUES(1902,:dataset,CAST(:metadata AS jsonb))"
            ),
            {"dataset": dataset, "metadata": json.dumps({"sha256": dataset})},
        )
    connection.execute(
        text(
            "INSERT INTO nba_models VALUES(1902,'laboratory','{\"sentinel\": true}','[]',now())"
        )
    )
    connection.execute(
        text(
            "INSERT INTO nba_prediction_history VALUES(1902,'0022600001','frozen','2026-11-13','2026-11-13T18:00Z','2026-11-12',0.7,'{}')"
        )
    )


def test_display_repair_preserves_models_ledger_roster_and_football(
    seeded, monkeypatch
):
    ingest.init_schema(seeded)
    with seeded.begin() as c:
        seed(c)
    data = frames()
    monkeypatch.setattr(
        ingest,
        "load_frame",
        lambda dataset, season: (data[dataset], {"sha256": dataset}),
    )
    result = ingest.refresh_display_stats(seeded, 1902)
    assert result == {"nba_players": 1, "nba_team_stats": 1}
    with seeded.connect() as c:
        assert (
            c.execute(
                text(
                    "SELECT metrics->>'min' FROM nba_players WHERE season=1902 AND id=7"
                )
            ).scalar()
            == "26.3"
        )
        assert (
            c.execute(
                text(
                    "SELECT metrics->>'stats_unavailable' FROM nba_players WHERE season=1902 AND id=8"
                )
            ).scalar()
            == "1"
        )
        assert (
            c.execute(
                text("SELECT metadata->>'sentinel' FROM nba_models WHERE season=1902")
            ).scalar()
            == "true"
        )
        assert (
            c.execute(
                text("SELECT home_win FROM nba_prediction_history WHERE season=1902")
            ).scalar()
            == 0.7
        )
        assert c.execute(text("SELECT count(*) FROM teams")).scalar() == 3


def test_display_repair_rejects_newer_archives_without_partial_updates(
    engine, monkeypatch
):
    ingest.init_schema(engine)
    with engine.begin() as c:
        seed(c)
    data = frames()
    monkeypatch.setattr(
        ingest,
        "load_frame",
        lambda dataset, season: (
            data[dataset],
            {"sha256": dataset if dataset.startswith("player") else "new-version"},
        ),
    )
    with pytest.raises(ValueError, match="same imported archive checksum"):
        ingest.refresh_display_stats(engine, 1902)
    with engine.connect() as c:
        assert (
            c.execute(
                text(
                    "SELECT metrics->>'min' FROM nba_players WHERE season=1902 AND id=7"
                )
            ).scalar()
            == "263"
        )
