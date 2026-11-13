"""Idempotent snapshots into NBA-only tables. Does not modify football tables."""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from sports_dashboard.config import load_database_url
from sports_dashboard.db import get_engine

from .source import load_frame

SQL_PATH = Path(__file__).resolve().parents[3] / "sql" / "nba.sql"
EAST = {
    "ATL",
    "BOS",
    "BKN",
    "CHA",
    "CHI",
    "CLE",
    "DET",
    "IND",
    "MIA",
    "MIL",
    "NYK",
    "ORL",
    "PHI",
    "TOR",
    "WAS",
}
STAT_FIELDS = [
    "gp",
    "w",
    "l",
    "w_pct",
    "min",
    "pts",
    "reb",
    "ast",
    "stl",
    "blk",
    "tov",
    "fgm",
    "fga",
    "fg_pct",
    "fg3m",
    "fg3a",
    "fg3_pct",
    "ftm",
    "fta",
    "ft_pct",
    "oreb",
    "dreb",
    "pf",
    "off_rating",
    "def_rating",
    "net_rating",
    "pace",
    "efg_pct",
    "ts_pct",
    "usg_pct",
    "ast_pct",
    "oreb_pct",
    "dreb_pct",
    "reb_pct",
    "tm_tov_pct",
    "poss",
    "pie",
    "fta_rate",
    "age",
]


def json_clean(value):
    return json.loads(json.dumps(value, default=str, allow_nan=False))


def records(frame):
    return json.loads(frame.to_json(orient="records", date_format="iso"))


def stats_snapshot(frame, key):
    selected = frame[
        (frame["season_type"] == "regular-season") & (frame["per_mode"] == "pergame")
    ]
    output = {}
    # Base and advanced values overlap (e.g. gp). Keep a single non-null value per entity.
    for row in records(selected):
        target = output.setdefault(int(row[key]), {})
        for name in STAT_FIELDS:
            if row.get(name) is not None:
                target[name] = row[name]
        for name in ["player_name", "team_name", "team_id", "team_abbreviation"]:
            if row.get(name) is not None:
                target[name] = row[name]
    return output


def regular(frame):
    if "season_type" in frame:
        return frame[frame["season_type"].eq("regular-season")].copy()
    return frame[frame["game_id"].astype(str).str.startswith("002")].copy()


def complete_player_stats(stats, logs, roster=None):
    """A newly returned player may appear in game logs before season aggregates."""
    output = {pid: dict(values) for pid, values in stats.items()}
    for player_id, group in logs.groupby("player_id"):
        if int(player_id) in output:
            continue
        ordered = group.sort_values(["game_date", "game_id"])
        last = records(ordered.tail(1))[0]
        values = {
            key: float(pd.to_numeric(group[key]).mean())
            for key in STAT_FIELDS
            if key in group and pd.to_numeric(group[key]).notna().any()
        }
        values.update(
            {
                "gp": int(group.game_id.nunique()),
                "stats_from_logs": 1,
                "player_name": last["player_name"],
                "team_id": int(last["team_id"]),
                "team_abbreviation": last["team_abbreviation"],
            }
        )
        for made, attempts, percentage in [
            ("fgm", "fga", "fg_pct"),
            ("fg3m", "fg3a", "fg3_pct"),
            ("ftm", "fta", "ft_pct"),
        ]:
            denominator = group[attempts].sum()
            values[percentage] = (
                float(group[made].sum() / denominator) if denominator else None
            )
        output[int(player_id)] = values
    if roster is not None:
        for row in records(roster):
            player_id = int(row["player_id"])
            if player_id not in output:
                output[player_id] = {
                    "player_name": row["player"],
                    "team_id": int(row["team_id"]),
                    "age": row.get("age"),
                    "stats_unavailable": 1,
                }
    return output


def init_schema(engine):
    with engine.begin() as connection:
        connection.exec_driver_sql(SQL_PATH.read_text(encoding="utf-8"))


def write_rows(connection, table, rows):
    if not rows:
        return
    columns = list(rows[0])
    expressions = [
        f"CAST(:{c} AS jsonb)"
        if c in {"metrics", "metadata", "predictions"}
        else f":{c}"
        for c in columns
    ]
    statement = text(
        f"INSERT INTO {table} ({','.join(columns)}) VALUES ({','.join(expressions)})"
    )
    for offset in range(0, len(rows), 1000):
        connection.execute(statement, rows[offset : offset + 1000])


def ingest_season(engine, season, refresh=False):
    datasets = [
        "team_game_logs",
        "schedules",
        "player_season_stats",
        "team_season_stats",
        "player_game_logs",
        "shots",
        "rosters",
    ]
    frames, provenance = {}, {}
    for name in datasets:
        frames[name], provenance[name] = load_frame(name, season, refresh)
        print(
            f"{season}-{str(season + 1)[-2:]} {name}: {len(frames[name])} rows",
            flush=True,
        )
    team_logs = regular(frames["team_game_logs"])
    schedule = regular(frames["schedules"])
    today = datetime.now(UTC).date().isoformat()
    if (pd.to_datetime(team_logs.game_date).dt.date.astype(str) > today).any():
        raise ValueError("Source contains future completed games")
    teams = {
        int(r["team_id"]): {
            "id": int(r["team_id"]),
            "name": r["team_name"],
            "abbreviation": r["team_abbreviation"],
            "conference": "Este" if r["team_abbreviation"] in EAST else "Oeste",
        }
        for r in records(team_logs)
    }
    from nba_api.stats.static import teams as nba_teams

    if set(teams) != {int(t["id"]) for t in nba_teams.get_teams()}:
        raise ValueError("Source does not contain the 30 verified NBA team identities")
    valid = schedule[(schedule.home_team_id > 0) & (schedule.away_team_id > 0)].copy()
    if not set(valid.home_team_id).union(valid.away_team_id).issubset(teams):
        raise ValueError("Schedule references teams missing from team logs")
    games = []
    observations = {
        (str(r["game_id"]).zfill(10), int(r["team_id"])): r for r in records(team_logs)
    }
    for r in records(valid):
        played = (
            r.get("home_pts") is not None
            and r.get("away_pts") is not None
            and r.get("home_wl") in {"W", "L"}
            and str(r["game_date"])[:10] <= today
        )
        home_log = observations.get(
            (str(r["game_id"]).zfill(10), int(r["home_team_id"]))
        )
        away_log = observations.get(
            (str(r["game_id"]).zfill(10), int(r["away_team_id"]))
        )
        if (
            home_log
            and away_log
            and home_log.get("wl") in {"W", "L"}
            and away_log.get("wl") in {"W", "L"}
        ):
            # The game-log feed can be newer than the schedule snapshot. Reconcile
            # exact IDs, never present an observed final game as pending.
            r["home_pts"] = home_log["pts"]
            r["away_pts"] = away_log["pts"]
            r["game_date"] = home_log["game_date"]
            played = True
        games.append(
            {
                "season": season,
                "id": str(r["game_id"]).zfill(10),
                "game_date": str(r["game_date"])[:10],
                "home_id": int(r["home_team_id"]),
                "away_id": int(r["away_team_id"]),
                "home_pts": int(r["home_pts"]) if played else None,
                "away_pts": int(r["away_pts"]) if played else None,
                "status": "finished" if played else "scheduled",
            }
        )
    team_stats = stats_snapshot(frames["team_season_stats"], "team_id")
    player_stats = stats_snapshot(frames["player_season_stats"], "player_id")
    player_logs = regular(frames["player_game_logs"])
    roster = frames["rosters"]
    roster.columns = [str(c).lower() for c in roster.columns]
    player_stats = complete_player_stats(
        player_stats, player_logs, roster[roster.team_id.isin(teams)]
    )
    positions = {}
    if {"player_id", "position"}.issubset(roster.columns):
        positions = {
            int(r["player_id"]): r.get("position")
            for r in records(roster)
            if r.get("player_id")
        }
    player_rows = [
        {
            "season": season,
            "id": pid,
            "name": s.pop("player_name"),
            "team_id": int(s["team_id"]),
            "position": positions.get(pid),
            "metrics": json.dumps(s),
        }
        for pid, s in player_stats.items()
    ]
    log_rows = [
        {
            "season": season,
            "game_id": str(r["game_id"]).zfill(10),
            "team_id": int(r["team_id"]),
            "game_date": str(r["game_date"])[:10],
            "metrics": json.dumps(
                {k: r.get(k) for k in ["matchup", "wl", "min", *STAT_FIELDS]}
            ),
        }
        for r in records(team_logs)
    ]
    player_logs = regular(frames["player_game_logs"])
    player_game_rows = [
        {
            "season": season,
            "game_id": str(r["game_id"]).zfill(10),
            "player_id": int(r["player_id"]),
            "team_id": int(r["team_id"]),
            "game_date": str(r["game_date"])[:10],
            "metrics": json.dumps({k: r.get(k) for k in STAT_FIELDS}),
        }
        for r in records(player_logs)
    ]
    from .shots import normalize_shots

    shots = normalize_shots(frames["shots"], season)
    shots_rows = records(shots)
    provenance["schedules"].update(
        {
            "unassigned": len(schedule) - len(valid),
            "assigned": len(valid),
            "expected_regular_games": 1230,
            "forecast_scope": "calendario publicado",
            "finished": sum(g["status"] == "finished" for g in games),
            "score_reconciliation": "Exact game/team IDs from completed team game logs override older schedule scores.",
        }
    )
    init_schema(engine)
    # Replace a season snapshot atomically. Partial downloads never remove usable data.
    with engine.begin() as connection:
        for name in [
            "nba_games",
            "nba_team_games",
            "nba_team_stats",
            "nba_players",
            "nba_player_games",
            "nba_shots",
            "nba_sources",
        ]:
            connection.execute(
                text(f"DELETE FROM {name} WHERE season=:season"), {"season": season}
            )
        for row in teams.values():
            connection.execute(
                text(
                    "INSERT INTO nba_teams(id,name,abbreviation,conference) VALUES(:id,:name,:abbreviation,:conference) ON CONFLICT(id) DO UPDATE SET name=excluded.name,abbreviation=excluded.abbreviation,conference=excluded.conference"
                ),
                row,
            )
        write_rows(connection, "nba_games", games)
        write_rows(connection, "nba_team_games", log_rows)
        write_rows(
            connection,
            "nba_team_stats",
            [
                {"season": season, "team_id": tid, "metrics": json.dumps(s)}
                for tid, s in team_stats.items()
            ],
        )
        write_rows(connection, "nba_players", player_rows)
        write_rows(connection, "nba_player_games", player_game_rows)
        write_rows(connection, "nba_shots", shots_rows)
        write_rows(
            connection,
            "nba_sources",
            [
                {"season": season, "dataset": name, "metadata": json.dumps(meta)}
                for name, meta in provenance.items()
            ],
        )
        # Models trained on a different snapshot must not be presented as current.
        connection.execute(
            text("DELETE FROM nba_models WHERE season=:season"), {"season": season}
        )
    return {
        "games": len(games),
        "players": len(player_rows),
        "shots": len(shots_rows),
        "teams": len(teams),
        "unassigned": len(schedule) - len(valid),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Import attributed NBA Stats archive snapshots"
    )
    parser.add_argument("--season", type=int, default=datetime.now(UTC).year)
    parser.add_argument("--history", type=int, default=0, choices=range(11))
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args(argv)
    engine = get_engine(load_database_url())
    print(json.dumps(ingest_season(engine, args.season, args.refresh)))
    # Training history only needs immutable cached files; do not populate historical UI with incomplete datasets.
    for year in range(args.season - args.history, args.season):
        for dataset in ["team_game_logs", "shots"]:
            frame, _ = load_frame(dataset, year, args.refresh)
            print(f"history {year} {dataset}: {len(frame)}", flush=True)
    engine.dispose()


if __name__ == "__main__":
    main()
