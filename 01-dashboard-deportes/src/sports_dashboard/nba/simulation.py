"""Reproducible Monte Carlo, explicitly conditional on the published schedule."""

from datetime import date

import numpy as np
import pandas as pd

from .features import FEATURES, matchup_features


def simulate(model, snapshots, teams, games, runs=10_000, seed=42):
    if not 100 <= runs <= 100_000:
        raise ValueError("Simulation count must be between 100 and 100000")
    ids = sorted(snapshots)
    if len(ids) != 30 or len({t["id"] for t in teams}) != 30:
        raise ValueError("A season simulation requires 30 verified teams")
    index = {tid: i for i, tid in enumerate(ids)}
    conferences = {
        c: [index[t["id"]] for t in teams if t["conference"] == c]
        for c in ["Este", "Oeste"]
    }
    if any(len(v) != 15 for v in conferences.values()):
        raise ValueError("Each conference must contain 15 teams")
    valid = [g for g in games if g["home_id"] in index and g["away_id"] in index]
    if len({g["id"] for g in valid}) != len(valid):
        raise ValueError("Duplicate scheduled game")
    if len(valid) > 1230:
        raise ValueError("Regular-season schedule exceeds 1230 games")
    rng = np.random.default_rng(seed)
    wins = np.zeros((runs, 30), dtype=np.int16)
    played = np.zeros(30, dtype=np.int16)
    head = np.zeros((runs, 30, 30), dtype=np.int8)
    conf_wins = np.zeros((runs, 30), dtype=np.int16)
    conf_played = np.zeros(30, dtype=np.int16)
    conf_names = {index[t["id"]]: t["conference"] for t in teams}
    last = {tid: date.fromisoformat(snapshots[tid]["last_date"]) for tid in ids}
    pending = []
    inputs = []
    for game in sorted(valid, key=lambda g: (str(g["game_date"]), g["id"])):
        home, away = index[game["home_id"]], index[game["away_id"]]
        played[home] += 1
        played[away] += 1
        if conf_names[home] == conf_names[away]:
            conf_played[home] += 1
            conf_played[away] += 1
        if game["status"] == "finished":
            winner, loser = (
                (home, away) if game["home_pts"] > game["away_pts"] else (away, home)
            )
            wins[:, winner] += 1
            head[:, winner, loser] += 1
            if conf_names[home] == conf_names[away]:
                conf_wins[:, winner] += 1
            continue
        day = date.fromisoformat(str(game["game_date"])[:10])
        rest = [
            max(0, min(7, (day - last[tid]).days - 1))
            for tid in [game["home_id"], game["away_id"]]
        ]
        inputs.append(
            matchup_features(
                snapshots[game["home_id"]], snapshots[game["away_id"]], *rest
            )
        )
        pending.append((home, away))
        last[game["home_id"]] = day
        last[game["away_id"]] = day
    if not pending or (played < 70).any():
        raise ValueError(
            "Insufficient remaining published schedule for season simulation"
        )
    probabilities = model.predict_proba(pd.DataFrame(inputs, columns=FEATURES))[:, 1]
    sample = np.arange(runs)
    for (home, away), probability in zip(pending, probabilities):
        home_win = rng.random(runs) < probability
        winner = np.where(home_win, home, away)
        loser = np.where(home_win, away, home)
        wins[sample, winner] += 1
        head[sample, winner, loser] += 1
        if conf_names[home] == conf_names[away]:
            conf_wins[sample, winner] += 1
    # Rates rather than raw wins also handle unequal counts in the published schedule.
    rates = wins / played
    ranked = {}
    for conference, members in conferences.items():
        order = np.empty((runs, 15), dtype=int)
        for run in range(runs):
            groups = {}
            for team in members:
                groups.setdefault(rates[run, team], []).append(team)
            result = []
            for _, tied in sorted(groups.items(), reverse=True):
                # Main head-to-head and conference criteria. Persistent ties use a
                # seeded draw; this is expressly not the complete NBA rulebook.
                def tie_key(team, run=run, tied=tied):
                    won = sum(
                        int(head[run, team, other]) for other in tied if other != team
                    )
                    lost = sum(
                        int(head[run, other, team]) for other in tied if other != team
                    )
                    return (
                        won / (won + lost) if won + lost else 0,
                        float(conf_wins[run, team] / max(1, conf_played[team])),
                        rng.random(),
                    )

                result.extend(sorted(tied, key=tie_key, reverse=True))
            order[run] = result
        ranked[conference] = order
    pinputs = [
        matchup_features(snapshots[h], snapshots[a], 1, 1, True)
        for h in ids
        for a in ids
    ]
    probability_matrix = model.predict_proba(pd.DataFrame(pinputs, columns=FEATURES))[
        :, 1
    ].reshape(30, 30)
    totals = {
        key: np.zeros(30, dtype=int)
        for key in [
            "direct",
            "playin",
            "playoffs",
            "round2",
            "conference_final",
            "final",
            "champion",
        ]
    }

    def add(key, values):
        totals[key] += np.bincount(np.asarray(values).ravel(), minlength=30)

    def single(home, away):
        return np.where(rng.random(runs) < probability_matrix[home, away], home, away)

    def series(first, second, rank_order):
        # Rank order gives home court within a conference; league win rate in finals.
        home_first = rank_order[sample, first] <= rank_order[sample, second]
        higher = np.where(home_first, first, second)
        lower = np.where(home_first, second, first)
        count_h = np.zeros(runs, dtype=int)
        count_l = np.zeros(runs, dtype=int)
        for number in range(7):
            home, away = (higher, lower) if number in [0, 1, 4, 6] else (lower, higher)
            active = (count_h < 4) & (count_l < 4)
            winner = single(home, away)
            count_h += active & (winner == higher)
            count_l += active & (winner == lower)
        return np.where(count_h == 4, higher, lower)

    finalists = []
    for order in ranked.values():
        add("direct", order[:, :6])
        add("playin", order[:, 6:10])
        seven = single(order[:, 6], order[:, 7])
        loser = np.where(seven == order[:, 6], order[:, 7], order[:, 6])
        survivor = single(order[:, 8], order[:, 9])
        eight = single(loser, survivor)
        field = np.column_stack([order[:, :6], seven, eight])
        add("playoffs", field)
        rank_order = np.full((runs, 30), 99, dtype=int)
        for pos in range(15):
            rank_order[sample, order[:, pos]] = pos
        brackets = [(0, 7), (3, 4), (2, 5), (1, 6)]
        r2 = np.column_stack(
            [series(field[:, a], field[:, b], rank_order) for a, b in brackets]
        )
        add("round2", r2)
        cf = np.column_stack(
            [
                series(r2[:, 0], r2[:, 1], rank_order),
                series(r2[:, 2], r2[:, 3], rank_order),
            ]
        )
        add("conference_final", cf)
        final = series(cf[:, 0], cf[:, 1], rank_order)
        add("final", final)
        finalists.append(final)
    league_order = np.argsort(np.argsort(-rates, axis=1), axis=1)
    champion = series(finalists[0], finalists[1], league_order)
    add("champion", champion)
    output = []
    for tid in ids:
        i = index[tid]
        row = {
            "team_id": tid,
            "wins_mean": float(wins[:, i].mean()),
            "wins_p05": int(np.quantile(wins[:, i], 0.05)),
            "wins_p95": int(np.quantile(wins[:, i], 0.95)),
            "scheduled_games": int(played[i]),
        }
        row.update({key: float(count[i] / runs) for key, count in totals.items()})
        row["champion_mc_se"] = float(
            np.sqrt(row["champion"] * (1 - row["champion"]) / runs)
        )
        output.append(row)
    metadata = {
        "runs": runs,
        "seed": seed,
        "published_games": len(valid),
        "expected_games": 1230,
        "missing_games": max(0, 1230 - len(valid)),
        "conditional": len(valid) != 1230,
        "scope": "Simulación del calendario publicado, play-in y series. Las fuerzas de los equipos permanecen fijas.",
        "ties": "Desempates aproximados: enfrentamientos directos, porcentaje de victorias de conferencia y sorteo. No reproduce todas las reglas NBA.",
        "rest": "Días libres según calendario conocido; un día libre por equipo en partidos de postemporada sin fecha asignada.",
        "uncertainty": "El error Monte Carlo no mide la incertidumbre del modelo ni futuros cambios de plantilla.",
    }
    return output, metadata
