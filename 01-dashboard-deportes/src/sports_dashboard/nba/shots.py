"""Shot context only: no outcome-bearing descriptions or fabricated tracking."""

import re

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier

from .models import evaluate, fit_temporal, logistic

SHOT_FEATURES = ["x", "y", "distance", "angle", "period", "seconds", "value"]


def clock_seconds(value):
    match = re.fullmatch(r"PT(\d+)M([\d.]+)S", str(value))
    if not match:
        raise ValueError(f"Invalid period clock: {value}")
    return int(match[1]) * 60 + float(match[2])


def normalize_shots(frame, season):
    needed = {
        "game_id",
        "season",
        "person_id",
        "team_id",
        "period",
        "clock",
        "shot_result",
        "shot_value",
        "shot_distance",
        "x_legacy",
        "y_legacy",
    }
    if not needed.issubset(frame.columns):
        raise ValueError("Shot archive missing confirmed individual variables")
    source = frame[frame.game_id.astype(str).str.startswith("002")].copy()
    if not pd.to_numeric(source.season).eq(season + 1).all():
        raise ValueError("Wrong shot season")
    if not set(source.shot_result.dropna()).issubset({"Made", "Missed"}):
        raise ValueError("Unknown shot result")
    result = pd.DataFrame(
        {
            "season": season,
            "id": np.arange(len(source)),
            "game_id": source.game_id.astype(str).str.zfill(10).to_numpy(),
            "player_id": source.person_id.to_numpy(),
            "team_id": source.team_id.to_numpy(),
            "x": pd.to_numeric(source.x_legacy).to_numpy() / 10,
            "y": pd.to_numeric(source.y_legacy).to_numpy() / 10,
            "distance": pd.to_numeric(source.shot_distance).to_numpy(),
            "period": source.period.to_numpy(),
            "seconds": source.clock.map(clock_seconds).to_numpy(),
            "value": source.shot_value.to_numpy(),
            "made": source.shot_result.eq("Made").astype(int).to_numpy(),
        }
    )
    numeric = [
        "x",
        "y",
        "distance",
        "period",
        "seconds",
        "value",
        "made",
        "player_id",
        "team_id",
    ]
    if not np.isfinite(result[numeric].to_numpy(dtype=float)).all():
        raise ValueError("Non-finite shot coordinate/context")
    if (
        not result.value.isin([2, 3]).all()
        or not result.period.between(1, 20).all()
        or not result.distance.between(0, 100).all()
    ):
        raise ValueError("Invalid shot value, period or distance")
    if (result.seconds < 0).any() or (
        result.seconds > np.where(result.period <= 4, 720, 300)
    ).any():
        raise ValueError("Clock outside period duration")
    # Source has no event ID. Preserve every row, including visually identical tips;
    # row IDs identify this snapshot only. Never claim game/event deduplication.
    return result


def shot_features(frame):
    result = frame.copy()
    result["angle"] = np.degrees(np.arctan2(result.x, result.y))
    return result


def boosting():
    return HistGradientBoostingClassifier(
        max_iter=100,
        max_leaf_nodes=15,
        min_samples_leaf=150,
        learning_rate=0.08,
        l2_regularization=5,
        early_stopping=False,
        random_state=42,
    )


def train_shots(frame):
    frame = shot_features(frame).rename(columns={"made": "target"})
    model, report, evaluated, test = fit_temporal(frame, SHOT_FEATURES, boosting)
    history = frame[frame.season < report["test_season"]]
    baseline = logistic().fit(history[SHOT_FEATURES], history.target)
    report["logistic_baseline"] = evaluate(
        test.target, baseline.predict_proba(test[SHOT_FEATURES])[:, 1]
    )
    rates = history.groupby("value").target.mean()
    report["value_baseline"] = evaluate(
        test.target, test.value.map(rates).fillna(history.target.mean())
    )
    report["by_value"] = {
        str(value): evaluate(
            group.target, evaluated.predict_proba(group[SHOT_FEATURES])[:, 1]
        )
        for value, group in test.groupby("value")
    }
    report["scope"] = (
        "Posición, distancia, ángulo, periodo y reloj del cuarto. Sin tracking de defensor ni shot clock."
    )
    report["heaves"] = (
        "Incluye tiros lejanos; no se eliminan los fallos de final de periodo."
    )
    report["target"] = (
        "P(acierto del tiro), no una medición causal de calidad defensiva."
    )
    return model, report
