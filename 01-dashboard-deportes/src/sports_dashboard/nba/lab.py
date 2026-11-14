"""Publish simulation inputs and an append-only, genuinely prospective forecast ledger."""

import argparse
import json
from datetime import UTC, datetime
from hashlib import sha256
from importlib.metadata import version
from pathlib import Path
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sqlalchemy import text
from threadpoolctl import threadpool_limits

from sports_dashboard.config import load_database_url
from sports_dashboard.db import get_engine

from .features import FEATURES, build_games, matchup_features, with_schedule
from .ingest import init_schema
from .source import CACHE, load_frame

GROUPS_2026 = {
    "Oeste A": ["DAL", "DEN", "HOU", "PHX", "UTA"],
    "Oeste B": ["LAC", "MEM", "MIN", "NOP", "OKC"],
    "Oeste C": ["GSW", "LAL", "POR", "SAC", "SAS"],
    "Este A": ["BKN", "DET", "MIL", "ORL", "TOR"],
    "Este B": ["CLE", "IND", "MIA", "NYK", "PHI"],
    "Este C": ["ATL", "BOS", "CHA", "CHI", "WAS"],
}


def cup_groups(teams, games, season):
    if season != 2026:
        return None
    by_code = {t["abbreviation"]: int(t["id"]) for t in teams}
    groups = [
        {
            "name": name,
            "conference": name.split()[0],
            "teamIds": [by_code[a] for a in codes],
        }
        for name, codes in GROUPS_2026.items()
    ]
    membership = {tid: g["name"] for g in groups for tid in g["teamIds"]}
    selected = []
    for game in games:
        day = pd.Timestamp(game["game_date"])
        cup_night = day.weekday() == 4 or day.strftime("%m-%d") in {"11-24", "11-25"}
        if (
            pd.Timestamp("2026-10-30") <= day <= pd.Timestamp("2026-11-27")
            and cup_night
        ):
            if membership.get(game["home_id"]) != membership.get(game["away_id"]):
                raise ValueError("Cup night contains a cross-group game")
            selected.append(str(game["id"]))
    count = {int(t["id"]): 0 for t in teams}
    pairs = set()
    for game in games:
        if str(game["id"]) in selected:
            pair = tuple(sorted([int(game["home_id"]), int(game["away_id"])]))
            if pair in pairs:
                raise ValueError("Duplicate Cup group pairing")
            pairs.add(pair)
            count[int(game["home_id"])] += 1
            count[int(game["away_id"])] += 1
    if len(selected) != 60 or set(count.values()) != {4}:
        raise ValueError("Cup group schedule must contain 60 games and four per team")
    return {
        "groups": groups,
        "gameIds": selected,
        "source": "https://www.nba.com/news/nba-cup-101",
        "season": season,
    }


def linear_terms(model, values):
    """Exact additive decomposition of this fitted sklearn pipeline's logit."""
    frame = pd.DataFrame([values], columns=FEATURES)
    imputer, scaler, classifier = (
        model.steps[0][1],
        model.steps[1][1],
        model.steps[2][1],
    )
    transformed = scaler.transform(imputer.transform(frame))[0]
    terms = transformed * classifier.coef_[0]
    result = {
        "intercept": float(classifier.intercept_[0]),
        "terms": [
            {"feature": name, "value": float(value), "contribution": float(term)}
            for name, value, term in zip(FEATURES, values, terms)
        ],
    }
    result["logit"] = result["intercept"] + sum(
        t["contribution"] for t in result["terms"]
    )
    result["probability"] = float(1 / (1 + np.exp(-result["logit"])))
    return result


def record_forecasts(connection, season, predictions, model_version, cutoff, now=None):
    now = now or datetime.now(UTC)
    today = now.astimezone(ZoneInfo("America/New_York")).date()
    count = 0
    for game in predictions:
        day = pd.Timestamp(game["date"]).date()
        # No kickoff times in the archive: a same-day forecast is NOT auditable pregame.
        if day <= today or pd.Timestamp(cutoff).date() >= day:
            continue
        count += connection.execute(
            text("""INSERT INTO nba_prediction_history
            (season,game_id,model_version,forecast_day,created_at,data_cutoff,home_win,explanation)
            VALUES (:season,:id,:version,:today,:created,:cutoff,:p,CAST(:explanation AS jsonb))
            ON CONFLICT DO NOTHING"""),
            {
                "season": season,
                "id": game["id"],
                "version": model_version,
                "today": today,
                "created": now,
                "cutoff": cutoff,
                "p": game["probability"],
                "explanation": json.dumps(game["explanation"], allow_nan=False),
            },
        ).rowcount
    return count


def publish(engine, season=2026, game_model=None):
    init_schema(engine)
    model = (
        game_model
        if game_model is not None
        else joblib.load(CACHE / f"logistic_{season}.joblib")
    )
    history = []
    for year in range(season - 10, season):
        logs, _ = load_frame("team_game_logs", year)
        schedule, _ = load_frame("schedules", year)
        history.append(with_schedule(logs, schedule))
    historical = pd.concat(history, ignore_index=True)
    dataset, _ = build_games(historical)
    actual = historical[["game_id", "team_id", "pts"]].rename(
        columns={"team_id": "home_id", "pts": "home_pts"}
    )
    away = historical[["game_id", "team_id", "pts"]].rename(
        columns={"team_id": "away_id", "pts": "away_pts"}
    )
    dataset = dataset.merge(
        actual, on=["game_id", "home_id"], validate="one_to_one"
    ).merge(away, on=["game_id", "away_id"], validate="one_to_one")
    dataset["margin"] = dataset.home_pts - dataset.away_pts
    years = sorted(dataset.season.unique())

    def margin_model():
        return make_pipeline(
            SimpleImputer(strategy="median"), StandardScaler(), Ridge(alpha=100)
        )

    evaluated = margin_model().fit(
        dataset.loc[dataset.season < years[-1], FEATURES],
        dataset.loc[dataset.season < years[-1], "margin"],
    )
    test = dataset[dataset.season == years[-1]]
    predicted = evaluated.predict(test[FEATURES])
    margin_report = {
        "test_season": int(years[-1]),
        "train_seasons": [int(y) for y in years[:-1]],
        "features": FEATURES,
        "alpha": 100,
        "n": len(test),
        "rmse": float(root_mean_squared_error(test.margin, predicted)),
        "mae": float(mean_absolute_error(test.margin, predicted)),
        "baseline_mae": float(
            mean_absolute_error(
                test.margin,
                np.full(
                    len(test), dataset.loc[dataset.season < years[-1], "margin"].mean()
                ),
            )
        ),
        "method": "Ridge alpha=100; pregame features; test untouched before production refit",
    }
    margin = margin_model().fit(dataset[FEATURES], dataset.margin)
    residual = dataset.margin - margin.predict(dataset[FEATURES])
    current, source = load_frame("team_game_logs", season)
    schedule, _ = load_frame("schedules", season)
    _, snapshots = build_games(with_schedule(current, schedule), minimum_games=0)
    with engine.connect() as c:
        teams = [
            dict(r)
            for r in c.execute(text("SELECT * FROM nba_teams ORDER BY id")).mappings()
        ]
        games = [
            dict(r)
            for r in c.execute(
                text("SELECT * FROM nba_games WHERE season=:s ORDER BY game_date,id"),
                {"s": season},
            ).mappings()
        ]
    ids = [int(t["id"]) for t in teams]
    cutoff = max(s["last_date"] for s in snapshots.values())
    today = datetime.now(ZoneInfo("America/New_York")).date().isoformat()
    if cutoff > today:
        raise ValueError("Current snapshot contains future completed games")
    previous = historical[
        (historical.season == historical.season.max())
        & (historical.season_type == "regular-season")
    ]
    prior_pct = (
        previous.groupby("team_id")
        .wl.apply(lambda x: float((x == "W").mean()))
        .to_dict()
    )
    divisions = {
        "Atlantic": ["BOS", "BKN", "NYK", "PHI", "TOR"],
        "Central": ["CHI", "CLE", "DET", "IND", "MIL"],
        "Southeast": ["ATL", "CHA", "MIA", "ORL", "WAS"],
        "Northwest": ["DEN", "MIN", "OKC", "POR", "UTA"],
        "Pacific": ["GSW", "LAC", "LAL", "PHX", "SAC"],
        "Southwest": ["DAL", "HOU", "MEM", "NOP", "SAS"],
    }
    teams_out = [
        {
            "id": int(t["id"]),
            "name": t["name"],
            "abbreviation": t["abbreviation"],
            "conference": t["conference"],
            "division": next(k for k, v in divisions.items() if t["abbreviation"] in v),
            "priorPct": prior_pct.get(t["id"], 0),
            "lastDate": snapshots[t["id"]]["last_date"],
        }
        for t in teams
    ]
    matrices = {}
    for name, playoff, neutral in [
        ("regular", False, False),
        ("playoffs", True, False),
        ("neutral", False, True),
    ]:
        values = [
            matchup_features(snapshots[h], snapshots[a], 1, 1, playoff)
            for h in ids
            for a in ids
        ]
        if neutral:
            for row in values:
                row[FEATURES.index("home_advantage")] = 0
        frame = pd.DataFrame(values, columns=FEATURES)
        probabilities = model.predict_proba(frame)[:, 1].reshape(30, 30)
        # Neutral courts have no arbitrary East/home assignment advantage.
        if neutral:
            probabilities = (probabilities + 1 - probabilities.T) / 2
        matrices[name] = probabilities.tolist()
        if name == "regular":
            matrices["margin"] = margin.predict(frame).reshape(30, 30).tolist()
    minute_lookup = {
        (str(r.game_id), int(r.team_id)): float(r.min) for r in current.itertuples()
    }
    last = {tid: pd.Timestamp(snapshots[tid]["last_date"]) for tid in ids}
    output = []
    for g in games:
        day = pd.Timestamp(g["game_date"])
        rest = [
            max(0, min(7, (day - last[tid]).days - 1))
            for tid in [g["home_id"], g["away_id"]]
        ]
        values = matchup_features(
            snapshots[g["home_id"]], snapshots[g["away_id"]], *rest
        )
        explanation = linear_terms(model, values)
        item = {
            "id": str(g["id"]),
            "date": day.date().isoformat(),
            "homeId": int(g["home_id"]),
            "awayId": int(g["away_id"]),
            "homePts": g["home_pts"],
            "awayPts": g["away_pts"],
            "status": g["status"],
            "overtime": minute_lookup.get((str(g["id"]), int(g["home_id"])), 240) > 240,
        }
        if g["status"] != "finished":
            item.update(
                {
                    "probability": explanation["probability"],
                    "margin": float(
                        margin.predict(pd.DataFrame([values], columns=FEATURES))[0]
                    ),
                    "explanation": explanation,
                }
            )
            for tid in [g["home_id"], g["away_id"]]:
                last[tid] = day
        output.append(item)
    cup = cup_groups(teams, games, season)
    payload = {
        "version": 1,
        "season": season,
        "created": datetime.now(UTC).isoformat(),
        "cutoff": cutoff,
        "teams": teams_out,
        "games": output,
        "matrices": matrices,
        "cup": cup,
        "marginReport": margin_report,
        "marginSD": float(residual.std()),
        "totalMean": float((dataset.home_pts + dataset.away_pts).mean()),
        "totalSD": float((dataset.home_pts + dataset.away_pts).std()),
        "overtimeRate": float((historical["min"] > 240).mean()),
    }
    engine_path = Path(__file__).resolve().parents[3] / "web/src/lib/nba-simulator.ts"
    payload["engineSha256"] = sha256(
        engine_path.read_bytes().replace(b"\r\n", b"\n")
    ).hexdigest()
    payload["publisherSha256"] = sha256(
        Path(__file__).read_bytes().replace(b"\r\n", b"\n")
    ).hexdigest()
    payload["sourceSha256"] = source.get("sha256")
    payload["libraries"] = {
        name: version(name) for name in ["scikit-learn", "numpy", "pandas"]
    }
    fingerprint = {k: v for k, v in payload.items() if k != "created"}
    model_version = sha256(
        json.dumps(fingerprint, sort_keys=True, default=str).encode()
    ).hexdigest()[:20]
    payload["modelVersion"] = model_version
    with engine.begin() as c:
        c.execute(
            text("""INSERT INTO nba_models(season,kind,metadata,predictions) VALUES(:s,'laboratory',CAST(:m AS jsonb),'[]')
        ON CONFLICT(season,kind) DO UPDATE SET metadata=excluded.metadata,predictions=excluded.predictions,created_at=now()"""),
            {"s": season, "m": json.dumps(payload, allow_nan=False)},
        )
        saved = record_forecasts(
            c,
            season,
            [g for g in output if g["status"] == "scheduled"],
            model_version,
            cutoff,
        )
    print(
        json.dumps(
            {
                "season": season,
                "modelVersion": model_version,
                "cup_games": len(cup["gameIds"]) if cup else 0,
                "new_forecasts": saved,
                "margin": margin_report,
            }
        ),
        flush=True,
    )
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", type=int, default=2026)
    args = parser.parse_args()
    with threadpool_limits(limits=4):
        publish(get_engine(load_database_url()), args.season)
