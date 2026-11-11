import datetime

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
    "home_ht_goals",
    "away_ht_goals",
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
        score = match.get("score") or {}
        full_time = score.get("fullTime") or {}
        half_time = score.get("halfTime") or {}
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
                "home_ht_goals": half_time.get("home"),
                "away_ht_goals": half_time.get("away"),
            }
        )

    matches = pd.DataFrame(rows, columns=MATCH_COLUMNS).drop_duplicates("id")
    matches["utc_date"] = pd.to_datetime(matches["utc_date"], utc=True)
    matches["matchday"] = matches["matchday"].astype("Int64")
    matches["home_goals"] = matches["home_goals"].astype("Int64")
    for column in ("away_goals", "home_ht_goals", "away_ht_goals"):
        matches[column] = matches[column].astype("Int64")

    teams_df = pd.DataFrame(sorted(teams.items()), columns=["id", "name"])
    return teams_df, matches.reset_index(drop=True)


TEAM_COLUMNS = [
    "id",
    "name",
    "short_name",
    "tla",
    "crest",
    "founded",
    "venue",
    "club_colors",
    "website",
    "coach",
]
PLAYER_COLUMNS = [
    "id",
    "team_id",
    "name",
    "position",
    "nationality",
    "date_of_birth",
]
SCORER_COLUMNS = [
    "competition",
    "season",
    "player_id",
    "team_id",
    "goals",
    "assists",
    "penalties",
    "played_matches",
]


def _player_row(player: dict, team_id: int) -> dict:
    birth = player.get("dateOfBirth")
    return {
        "id": player["id"],
        "team_id": team_id,
        "name": player["name"],
        "position": player.get("position"),
        "nationality": player.get("nationality"),
        "date_of_birth": datetime.date.fromisoformat(birth[:10]) if birth else None,
    }


def clean_teams(raw: list[dict]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Turn football-data.org team dicts into (teams, players) DataFrames."""
    team_rows = []
    player_rows = []
    for team in raw:
        team_rows.append(
            {
                "id": team["id"],
                "name": team["name"],
                "short_name": team.get("shortName"),
                "tla": team.get("tla"),
                "crest": team.get("crest"),
                "founded": team.get("founded"),
                "venue": team.get("venue"),
                "club_colors": team.get("clubColors"),
                "website": team.get("website"),
                "coach": (team.get("coach") or {}).get("name"),
            }
        )
        for player in team.get("squad") or []:
            player_rows.append(_player_row(player, team["id"]))

    teams = pd.DataFrame(team_rows, columns=TEAM_COLUMNS).drop_duplicates("id")
    teams["founded"] = teams["founded"].astype("Int64")
    players = pd.DataFrame(player_rows, columns=PLAYER_COLUMNS).drop_duplicates("id")
    return teams.reset_index(drop=True), players.reset_index(drop=True)


def clean_scorers(
    raw: list[dict], competition: str, season: int
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Turn football-data.org scorer dicts into (teams, players, scorers) DataFrames."""
    teams: dict[int, str] = {}
    player_rows = []
    scorer_rows = []
    for item in raw:
        player, team = item["player"], item["team"]
        teams[team["id"]] = team["name"]
        player_rows.append(_player_row(player, team["id"]))
        scorer_rows.append(
            {
                "competition": competition,
                "season": season,
                "player_id": player["id"],
                "team_id": team["id"],
                "goals": item.get("goals"),
                "assists": item.get("assists"),
                "penalties": item.get("penalties"),
                "played_matches": item.get("playedMatches"),
            }
        )

    teams_df = pd.DataFrame(sorted(teams.items()), columns=["id", "name"])
    players = pd.DataFrame(player_rows, columns=PLAYER_COLUMNS).drop_duplicates("id")
    scorers = pd.DataFrame(scorer_rows, columns=SCORER_COLUMNS).drop_duplicates(
        ["player_id", "team_id"]
    )
    for column in ("goals", "assists", "penalties", "played_matches"):
        scorers[column] = scorers[column].astype("Int64")
    return teams_df, players.reset_index(drop=True), scorers.reset_index(drop=True)
