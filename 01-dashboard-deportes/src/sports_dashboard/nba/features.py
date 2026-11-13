"""Pregame features. Every rolling statistic is shifted before it is used."""

import numpy as np
import pandas as pd

STRENGTH = [
    "off_est",
    "def_est",
    "pace_est",
    "efg",
    "tov_rate",
    "oreb_rate",
    "ft_rate",
    "win",
    "recent_off",
    "recent_def",
]
FEATURES = [f"{key}_diff" for key in STRENGTH] + [
    "rest_diff",
    "home_advantage",
    "playoffs",
]


def with_schedule(logs, schedule):
    """Home/away strings are ambiguous at neutral venues; use the schedule IDs."""
    schedule = schedule[["game_id", "home_team_id", "away_team_id"]].copy()
    schedule["game_id"] = schedule.game_id.astype(str).str.zfill(10)
    if schedule.game_id.duplicated().any():
        raise ValueError("Duplicate schedule game IDs")
    merged = logs.merge(schedule, on="game_id", how="left", validate="many_to_one")
    selected = merged.game_id.astype(str).str.startswith(("002", "004", "005"))
    if merged.loc[selected, ["home_team_id", "away_team_id"]].isna().any().any():
        raise ValueError("Historical schedule cannot identify all team game sides")
    return merged


def team_history(logs: pd.DataFrame) -> pd.DataFrame:
    frame = logs.copy()
    frame["game_id"] = frame.game_id.astype(str).str.zfill(10)
    frame = frame[frame.game_id.str.startswith(("002", "004", "005"))].copy()
    if frame.duplicated(["game_id", "team_id"]).any():
        raise ValueError("Duplicate team/game records")
    if not frame.groupby("game_id").size().eq(2).all():
        raise ValueError("Every game needs exactly two team records")
    frame["game_date"] = pd.to_datetime(frame.game_date)
    frame["season"] = pd.to_numeric(frame.season).astype(int)
    opponents = frame[
        ["game_id", "team_id", "pts", "fga", "fta", "oreb", "dreb", "tov"]
    ].rename(
        columns={
            c: f"opp_{c}"
            for c in ["team_id", "pts", "fga", "fta", "oreb", "dreb", "tov"]
        }
    )
    frame = frame.merge(opponents, on="game_id").query("team_id != opp_team_id").copy()
    numeric = [
        "pts",
        "fga",
        "fta",
        "oreb",
        "dreb",
        "tov",
        "fgm",
        "fg3m",
        "min",
        "opp_pts",
        "opp_fga",
        "opp_fta",
        "opp_oreb",
        "opp_tov",
    ]
    for key in numeric:
        frame[key] = pd.to_numeric(frame[key], errors="coerce")
    if frame[numeric].isna().any().any():
        raise ValueError("Incomplete box score in team history")
    own = frame.fga + 0.44 * frame.fta - frame.oreb + frame.tov
    other = frame.opp_fga + 0.44 * frame.opp_fta - frame.opp_oreb + frame.opp_tov
    frame["poss_est"] = (own + other) / 2
    if (frame.poss_est <= 0).any() or (frame["min"] <= 0).any():
        raise ValueError("Invalid estimated possessions or minutes")
    frame["off_est"] = 100 * frame.pts / frame.poss_est
    frame["def_est"] = 100 * frame.opp_pts / frame.poss_est
    frame["pace_est"] = 240 * frame.poss_est / frame["min"]
    frame["efg"] = (frame.fgm + 0.5 * frame.fg3m) / frame.fga.replace(0, np.nan)
    frame["tov_rate"] = frame.tov / frame.poss_est
    frame["oreb_rate"] = frame.oreb / (frame.oreb + frame.opp_dreb).replace(0, np.nan)
    frame["ft_rate"] = frame.fta / frame.fga.replace(0, np.nan)
    frame["win"] = (frame.pts > frame.opp_pts).astype(int)
    frame = frame.sort_values(
        ["season", "team_id", "game_date", "game_id"]
    ).reset_index(drop=True)
    group = frame.groupby(["season", "team_id"], sort=False)
    frame["prior_games"] = group.cumcount()
    frame["rest"] = group.game_date.diff().dt.days.sub(1).clip(0, 7)
    for key in STRENGTH[:8]:
        frame[f"pre_{key}"] = group[key].transform(
            lambda s: s.shift(1).expanding(min_periods=1).mean()
        )
    for key in ["off_est", "def_est"]:
        frame[f"pre_recent_{'off' if key == 'off_est' else 'def'}"] = group[
            key
        ].transform(lambda s: s.shift(1).rolling(10, min_periods=1).mean())
    return frame


def build_games(
    logs: pd.DataFrame, minimum_games: int = 5
) -> tuple[pd.DataFrame, dict]:
    frame = team_history(logs)
    if "home_team_id" in frame.columns:
        home = frame[frame.team_id == frame.home_team_id].copy()
        away = frame[frame.team_id == frame.away_team_id].copy()
    else:
        home = frame[frame.matchup.str.contains("vs.", regex=False)].copy()
        away = frame[frame.matchup.str.contains("@", regex=False)].copy()
    paired = home.merge(
        away, on="game_id", suffixes=("_h", "_a"), validate="one_to_one"
    )
    if len(paired) * 2 != len(frame):
        raise ValueError("Cannot identify one home and one away team per game")
    output = pd.DataFrame(
        {
            "game_id": paired.game_id,
            "season": paired.season_h,
            "date": paired.game_date_h,
            "home_id": paired.team_id_h,
            "away_id": paired.team_id_a,
            "target": (paired.pts_h > paired.pts_a).astype(int),
        }
    )
    for key in STRENGTH:
        output[f"{key}_diff"] = paired[f"pre_{key}_h"] - paired[f"pre_{key}_a"]
    output["rest_diff"] = paired.rest_h - paired.rest_a
    output["home_advantage"] = ~(
        (output.season == 2020) & (output.date >= pd.Timestamp("2020-07-30"))
    )
    # Both teams are recorded as away in some neutral-site source games.
    neutral = paired.matchup_h.str.contains(
        "@", regex=False
    ) & paired.matchup_a.str.contains("@", regex=False)
    output.loc[neutral, "home_advantage"] = False
    output["home_advantage"] = output.home_advantage.astype(int)
    output["playoffs"] = output.game_id.str.startswith("004").astype(int)
    usable = (paired.prior_games_h >= minimum_games) & (
        paired.prior_games_a >= minimum_games
    )
    output = output[usable].sort_values(["date", "game_id"]).reset_index(drop=True)
    # Latest known strength after all observed games, for future scenarios only.
    snapshots = {}
    for team_id, rows in frame.groupby("team_id"):
        current = rows[rows.season == rows.season.max()].sort_values(
            ["game_date", "game_id"]
        )
        last = current.iloc[-1]
        snapshots[int(team_id)] = {
            key: float(current[key].mean()) for key in STRENGTH[:8]
        }
        snapshots[int(team_id)].update(
            {
                "recent_off": float(current.off_est.tail(10).mean()),
                "recent_def": float(current.def_est.tail(10).mean()),
                "last_date": last.game_date.date().isoformat(),
                "games": len(current),
            }
        )
    return output, snapshots


def matchup_features(home: dict, away: dict, rest_home=1, rest_away=1, playoffs=False):
    return [home[key] - away[key] for key in STRENGTH] + [
        rest_home - rest_away,
        1,
        int(playoffs),
    ]
