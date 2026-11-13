"""Temporal probability evaluation. Test seasons never participate in fitting."""

import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def logistic():
    return make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        LogisticRegression(C=0.25, max_iter=1000, random_state=42),
    )


def evaluate(target, probability):
    target = np.asarray(target, dtype=int)
    probability = np.clip(np.asarray(probability, dtype=float), 1e-6, 1 - 1e-6)
    if (
        len(target) != len(probability)
        or not len(target)
        or not np.isfinite(probability).all()
    ):
        raise ValueError("Invalid probability evaluation data")
    bins = []
    bucket = np.minimum((probability * 10).astype(int), 9)
    for index in range(10):
        start = index / 10
        selected = bucket == index
        if selected.any():
            bins.append(
                {
                    "from": round(float(start), 1),
                    "n": int(selected.sum()),
                    "predicted": float(probability[selected].mean()),
                    "observed": float(target[selected].mean()),
                }
            )
    return {
        "n": len(target),
        "log_loss": float(log_loss(target, probability, labels=[0, 1])),
        "brier": float(brier_score_loss(target, probability)),
        "auc": float(roc_auc_score(target, probability))
        if len(np.unique(target)) > 1
        else None,
        "calibration": bins,
    }


def fit_temporal(frame, features, model_factory=logistic):
    years = sorted(frame.season.unique())
    if len(years) < 3:
        raise ValueError(
            "Need at least three complete seasons for train/validation/test"
        )
    train = frame[frame.season < years[-2]]
    validation = frame[frame.season == years[-2]]
    test = frame[frame.season == years[-1]]
    if any(
        part.empty or part.target.nunique() < 2 for part in [train, validation, test]
    ):
        raise ValueError("Temporal partitions require both target classes")
    model = model_factory().fit(train[features], train.target)
    validation_report = evaluate(
        validation.target, model.predict_proba(validation[features])[:, 1]
    )
    # Fixed configuration; train + validation are refit before the untouched test.
    evaluated = model_factory().fit(
        frame[frame.season < years[-1]][features],
        frame[frame.season < years[-1]].target,
    )
    prediction = evaluated.predict_proba(test[features])[:, 1]
    report = {
        "train_seasons": [int(y) for y in years[:-2]],
        "validation_season": int(years[-2]),
        "test_season": int(years[-1]),
        "validation": validation_report,
        "test": evaluate(test.target, prediction),
        "home_or_make_rate": evaluate(
            test.target,
            np.full(len(test), frame.loc[frame.season < years[-1], "target"].mean()),
        ),
        "features": features,
        "samples": len(frame),
        "production_refit_seasons": [int(y) for y in years],
    }
    # Production fit uses all completed seasons AFTER the held-out score is frozen.
    production = model_factory().fit(frame[features], frame.target)
    return production, report, evaluated, test


def elo_probabilities(frame):
    ratings = {}
    predictions = {}
    for row in frame.sort_values(["date", "game_id"]).itertuples():
        home = ratings.get(row.home_id, 1500)
        away = ratings.get(row.away_id, 1500)
        probability = 1 / (1 + 10 ** ((away - home - 65 * row.home_advantage) / 400))
        predictions[row.game_id] = probability
        change = 20 * (row.target - probability)
        ratings[row.home_id] = home + change
        ratings[row.away_id] = away - change
    return predictions
