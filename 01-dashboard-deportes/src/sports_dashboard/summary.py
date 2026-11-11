import pandas as pd


def season_summary(table: pd.DataFrame) -> dict | None:
    """Headline numbers for the KPI cards, computed from the standings table."""
    if table.empty:
        return None
    leader = table.iloc[0]
    attack = table.loc[table["gf"].idxmax()]
    defense = table.loc[table["ga"].idxmin()]
    # every match shows up twice in the table, once per team
    matches = int(table["played"].sum() // 2)
    return {
        "leader": leader["team"],
        "leader_points": int(leader["points"]),
        "best_attack": attack["team"],
        "best_attack_goals": int(attack["gf"]),
        "best_defense": defense["team"],
        "best_defense_goals": int(defense["ga"]),
        "matches_played": matches,
        "goals_per_match": round(float(table["gf"].sum()) / matches, 2),
    }
