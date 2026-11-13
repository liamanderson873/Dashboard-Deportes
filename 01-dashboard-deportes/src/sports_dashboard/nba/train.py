"""Offline training and publication of measured results; no work at web request time."""

import argparse
import json
import os
from datetime import UTC, datetime
from hashlib import sha256
from importlib.metadata import version
from pathlib import Path

# Bound CPU usage on a shared desktop before importing numerical libraries.
os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")
import joblib
import pandas as pd
from sqlalchemy import text
from threadpoolctl import threadpool_limits

from sports_dashboard.config import load_database_url
from sports_dashboard.db import get_engine

from .features import FEATURES, build_games, matchup_features, with_schedule
from .models import elo_probabilities, evaluate, fit_temporal
from .shots import SHOT_FEATURES, normalize_shots, shot_features, train_shots
from .simulation import simulate
from .source import CACHE, load_frame


def save_model(connection, season, kind, metadata, predictions):
    connection.execute(
        text(
            "INSERT INTO nba_models(season,kind,metadata,predictions) VALUES(:season,:kind,CAST(:metadata AS jsonb),CAST(:predictions AS jsonb)) ON CONFLICT(season,kind) DO UPDATE SET metadata=excluded.metadata,predictions=excluded.predictions,created_at=now()"
        ),
        {
            "season": season,
            "kind": kind,
            "metadata": json.dumps(metadata, allow_nan=False),
            "predictions": json.dumps(predictions, allow_nan=False),
        },
    )


def run(engine, season, history=10, shot_history=3, runs=10_000):
    if not 3 <= history <= 10 or not 3 <= shot_history <= 10:
        raise ValueError("History lengths must be between 3 and 10 seasons")
    logs = []
    manifest = []
    reproducibility = {
        "libraries": {
            name: version(name)
            for name in ["scikit-learn", "numpy", "pandas", "pyarrow", "nba_api"]
        },
        "code_sha256": {
            path.name: sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
            for path in sorted(Path(__file__).parent.glob("*.py"))
        },
        "seed": 42,
        "calibration_method": "Probabilidades del modelo sin calibrador posterior; fiabilidad evaluada sobre la temporada reservada.",
    }
    for year in range(season - history, season):
        frame, meta = load_frame("team_game_logs", year)
        schedule, schedule_meta = load_frame("schedules", year)
        manifest.extend(
            [{"season_start": year, **meta}, {"season_start": year, **schedule_meta}]
        )
        logs.append(with_schedule(frame, schedule))
        print(f"Historical games {year}: {len(frame)} team records", flush=True)
    historical = pd.concat(logs, ignore_index=True)
    dataset, _ = build_games(historical)
    model, report, _, test = fit_temporal(dataset, FEATURES)
    elo = elo_probabilities(dataset)
    report["elo_baseline"] = evaluate(test.target, test.game_id.map(elo))
    report["season_basis"] = "end-year"
    report["method"] = (
        "Regresión logística regularizada; estadísticas anteriores al partido. Ratings y pace estimados desde box scores."
    )
    report["postseason_games"] = int(dataset.playoffs.sum())
    report["created"] = datetime.now(UTC).isoformat()
    report.update(reproducibility)
    report["history_sources"] = manifest
    report["parameters"] = {"C": 0.25, "minimum_prior_games": 5, "max_iter": 1000}
    current, source = load_frame("team_game_logs", season)
    current_schedule, _ = load_frame("schedules", season)
    _, snapshots = build_games(
        with_schedule(current, current_schedule), minimum_games=0
    )
    with engine.connect() as connection:
        teams = [
            dict(r)
            for r in connection.execute(text("SELECT * FROM nba_teams")).mappings()
        ]
        games = [
            dict(r)
            for r in connection.execute(
                text("SELECT * FROM nba_games WHERE season=:season"), {"season": season}
            ).mappings()
        ]
    predictions = []
    from datetime import date

    previous = {
        tid: date.fromisoformat(snapshots[tid]["last_date"]) for tid in snapshots
    }
    for game in sorted(games, key=lambda g: (g["game_date"], g["id"])):
        if game["status"] == "scheduled":
            day = game["game_date"]
            rests = [
                max(0, min(7, (day - previous[tid]).days - 1))
                for tid in [game["home_id"], game["away_id"]]
            ]
            values = matchup_features(
                snapshots[game["home_id"]], snapshots[game["away_id"]], *rests
            )
            probability = float(
                model.predict_proba(pd.DataFrame([values], columns=FEATURES))[0, 1]
            )
            predictions.append({"game_id": game["id"], "home_win": probability})
            previous[game["home_id"]] = day
            previous[game["away_id"]] = day
    report["source"] = source
    report["prediction_scope"] = (
        "Fuerza fija del equipo según el último corte de datos; descanso según encuentros previos del calendario publicado."
    )
    joblib.dump(model, CACHE / f"logistic_{season}.joblib")
    with engine.begin() as connection:
        save_model(connection, season, "games", report, predictions)
    print("Game model held-out:", json.dumps(report["test"]), flush=True)
    try:
        forecast, details = simulate(model, snapshots, teams, games, runs)
        details["game_model_test"] = report["test"]
        with engine.begin() as connection:
            save_model(connection, season, "playoffs", details, forecast)
        print("Season simulation:", json.dumps(details), flush=True)
    except ValueError as error:
        with engine.begin() as connection:
            save_model(connection, season, "playoffs", {"unavailable": str(error)}, [])
        print("Simulation unavailable:", error, flush=True)
    shots = []
    shot_manifest = []
    for year in range(season - shot_history, season):
        raw, meta = load_frame("shots", year)
        shot_manifest.append({"season_start": year, **meta})
        normalized = normalize_shots(raw, year)
        shots.append(normalized)
        print(f"Historical shots {year}: {len(normalized)}", flush=True)
    shot_model, shot_report = train_shots(pd.concat(shots, ignore_index=True))
    shot_report.update(
        {
            "season_basis": "start-year",
            "created": datetime.now(UTC).isoformat(),
            **reproducibility,
            "history_sources": shot_manifest,
            "parameters": {
                "max_iter": 100,
                "max_leaf_nodes": 15,
                "min_samples_leaf": 150,
                "learning_rate": 0.08,
                "l2_regularization": 5,
            },
        }
    )
    raw, provenance = load_frame("shots", season)
    current_shots = shot_features(normalize_shots(raw, season))
    probability = shot_model.predict_proba(current_shots[SHOT_FEATURES])[:, 1]
    updates = [
        {"id": int(i), "p": float(p)} for i, p in zip(current_shots.id, probability)
    ]
    shot_report["source"] = provenance
    joblib.dump(shot_model, CACHE / f"shots_{season}.joblib")
    with engine.begin() as connection:
        connection.execute(
            text(
                "UPDATE nba_shots s SET probability=u.p FROM jsonb_to_recordset(CAST(:rows AS jsonb)) AS u(id integer,p double precision) WHERE s.season=:season AND s.id=u.id"
            ),
            {"season": season, "rows": json.dumps(updates)},
        )
        save_model(connection, season, "shots", shot_report, [])
    print("Shot model held-out:", json.dumps(shot_report["test"]), flush=True)
    return {"games": report, "shots": shot_report}


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Train/evaluate NBA models on chronological seasons"
    )
    parser.add_argument("--season", type=int, default=datetime.now(UTC).year)
    parser.add_argument("--history", type=int, default=10)
    parser.add_argument("--shot-history", type=int, default=3)
    parser.add_argument("--runs", type=int, default=10_000)
    args = parser.parse_args(argv)
    engine = get_engine(load_database_url())
    with threadpool_limits(limits=4):
        result = run(engine, args.season, args.history, args.shot_history, args.runs)
    (CACHE / f"evaluation_{args.season}.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )
    engine.dispose()


if __name__ == "__main__":
    main()
