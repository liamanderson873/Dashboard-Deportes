from datetime import UTC, datetime

import numpy as np
import pandas as pd
import pytest
from nba_api.stats.static.teams import get_teams
from sqlalchemy import text

from sports_dashboard.nba.features import FEATURES
from sports_dashboard.nba.ingest import init_schema
from sports_dashboard.nba.lab import (
    GROUPS_2026,
    cup_groups,
    linear_terms,
    record_forecasts,
)
from sports_dashboard.nba.models import logistic


def test_logistic_contributions_reconstruct_probability_exactly():
    rng = np.random.default_rng(42)
    x = pd.DataFrame(rng.normal(size=(200, len(FEATURES))), columns=FEATURES)
    model = logistic().fit(x, (x.iloc[:, 0] + x.iloc[:, 1] > 0.1).astype(int))
    values = x.iloc[17].tolist()
    result = linear_terms(model, values)
    assert result["probability"] == pytest.approx(
        model.predict_proba(x.iloc[[17]])[0, 1], abs=1e-12
    )
    assert result["intercept"] + sum(
        t["contribution"] for t in result["terms"]
    ) == pytest.approx(result["logit"])


def test_ledger_excludes_same_day_and_future_cutoff_and_never_overwrites(engine):
    init_schema(engine)
    now = datetime(2026, 11, 13, 18, tzinfo=UTC)
    rows = [
        {
            "id": "0022600001",
            "date": "2026-11-14",
            "probability": 0.7,
            "explanation": {},
        },
        {
            "id": "0022600002",
            "date": "2026-11-13",
            "probability": 0.6,
            "explanation": {},
        },
    ]
    with engine.begin() as c:
        c.execute(text("DELETE FROM nba_prediction_history WHERE season=1901"))
        assert record_forecasts(c, 1901, rows, "v1", "2026-11-12", now) == 1
        rows[0]["probability"] = 0.1
        assert record_forecasts(c, 1901, rows, "v1", "2026-11-12", now) == 0
        assert (
            c.execute(
                text(
                    "SELECT home_win FROM nba_prediction_history WHERE season=1901 AND model_version='v1'"
                )
            ).scalar()
            == 0.7
        )
        assert record_forecasts(c, 1901, rows, "v2", "2026-11-14", now) == 0
        assert record_forecasts(c, 1901, rows, "v2", "2026-11-12", now) == 1
        c.execute(text("DELETE FROM nba_prediction_history WHERE season=1901"))


def cup_fixture():
    teams = get_teams()
    by_code = {t["abbreviation"]: t["id"] for t in teams}
    games = []
    number = 0
    for codes in GROUPS_2026.values():
        rotation = [*range(5), None]
        for round in range(5):
            for j in range(3):
                a, b = rotation[j], rotation[5 - j]
                if a is None or b is None:
                    continue
                h, w = (a, b) if (b - a) % 5 in [1, 2] else (b, a)
                number += 1
                games.append(
                    {
                        "id": f"00226{number:05d}",
                        "game_date": pd.Timestamp("2026-10-30")
                        + pd.Timedelta(days=7 * round),
                        "home_id": by_code[codes[h]],
                        "away_id": by_code[codes[w]],
                    }
                )
            rotation = [rotation[0], rotation[-1], *rotation[1:-1]]
    return teams, games


def test_cup_schedule_verified_against_groups_and_duplicate_pairs():
    teams, games = cup_fixture()
    config = cup_groups(teams, games, 2026)
    assert len(config["gameIds"]) == 60
    assert cup_groups(teams, games, 2025) is None
    with pytest.raises(ValueError):
        cup_groups(teams, games[:-1], 2026)
    with pytest.raises(ValueError):
        cup_groups(teams, [*games[:-1], games[0]], 2026)
