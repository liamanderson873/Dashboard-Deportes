import pandas as pd

MATCH_COLUMNS = [
    "id",
    "competition",
    "season",
    "matchday",
    "utc_date",
    "status",
    "home_team_id",
    "away_team_id",
    "home_goals",
    "away_goals",
]


def clean_matches(
    raw: list[dict], competition: str, season: int
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Turn football-data.org match dicts into (teams, matches) DataFrames."""
    teams: dict[int, str] = {}
    rows = []
    for match in raw:
        home, away = match["homeTeam"], match["awayTeam"]
        if home["id"] is None or away["id"] is None:
            continue
        teams[home["id"]] = home["name"]
        teams[away["id"]] = away["name"]
        full_time = (match.get("score") or {}).get("fullTime") or {}
        rows.append(
            {
                "id": match["id"],
                "competition": competition,
                "season": season,
                "matchday": match.get("matchday"),
                "utc_date": match["utcDate"],
                "status": match["status"],
                "home_team_id": home["id"],
                "away_team_id": away["id"],
                "home_goals": full_time.get("home"),
                "away_goals": full_time.get("away"),
            }
        )

    matches = pd.DataFrame(rows, columns=MATCH_COLUMNS).drop_duplicates("id")
    matches["utc_date"] = pd.to_datetime(matches["utc_date"], utc=True)
    matches["matchday"] = matches["matchday"].astype("Int64")
    matches["home_goals"] = matches["home_goals"].astype("Int64")
    matches["away_goals"] = matches["away_goals"].astype("Int64")

    teams_df = pd.DataFrame(sorted(teams.items()), columns=["id", "name"])
    return teams_df, matches.reset_index(drop=True)
