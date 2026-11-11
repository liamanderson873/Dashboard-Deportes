import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import pandas as pd  # noqa: E402
import streamlit as st  # noqa: E402

from sports_dashboard import queries  # noqa: E402
from sports_dashboard.config import ConfigError, load_database_url  # noqa: E402
from sports_dashboard.db import get_engine, init_schema  # noqa: E402
from sports_dashboard.summary import season_summary  # noqa: E402

COMPETITION_NAMES = {"PD": "LaLiga", "PL": "Premier League"}

# Colours follow the dashboard design system (blue primary, light tints for table zones).
TOP_ZONE_ROWS = 4
BOTTOM_ZONE_ROWS = 3
MIN_TEAMS_FOR_ZONES = 10
TOP_ZONE_COLOR = "#DBEAFE"
BOTTOM_ZONE_COLOR = "#FEE2E2"
PRIMARY_COLOR = "#1E40AF"

PAGE_STYLE = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&display=swap');
html, body, .stApp, .stApp button, .stApp input { font-family: 'Fira Sans', sans-serif; }
h1 { font-weight: 700; letter-spacing: -0.02em; }
div[data-testid="stMetric"] {
    background: #FFFFFF;
    border: 1px solid #DBEAFE;
    border-radius: 8px;
    padding: 12px 16px;
}
div[data-testid="stMetricValue"] {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    font-size: 1.5rem;
}
div[data-testid="stMetricValue"] > div,
div[data-testid="stMetricLabel"],
div[data-testid="stMetricLabel"] * {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
}
</style>
"""

st.set_page_config(page_title="Football dashboard", layout="wide")
st.markdown(PAGE_STYLE, unsafe_allow_html=True)
st.title("Football dashboard")


def zone_style(row: pd.Series, teams: int) -> list[str]:
    """Tint the top and bottom of the table; the legend below explains the colours."""
    if teams < MIN_TEAMS_FOR_ZONES:
        return [""] * len(row)
    if row["#"] <= TOP_ZONE_ROWS:
        return [f"background-color: {TOP_ZONE_COLOR}"] * len(row)
    if row["#"] > teams - BOTTOM_ZONE_ROWS:
        return [f"background-color: {BOTTOM_ZONE_COLOR}"] * len(row)
    return [""] * len(row)


@st.cache_resource
def engine_for(url: str):
    return get_engine(url)


try:
    database_url = load_database_url()
except ConfigError as error:
    st.error(str(error))
    st.stop()

engine = engine_for(database_url)
init_schema(engine)

seasons = queries.available_seasons(engine)
if seasons.empty:
    st.info(
        "No data yet. Load a season first with: "
        "`python -m sports_dashboard.ingest --competition PD --season 2024`"
    )
    st.stop()

competition = st.sidebar.selectbox(
    "Competition",
    sorted(seasons["competition"].unique()),
    format_func=lambda code: COMPETITION_NAMES.get(code, code),
)
season = st.sidebar.selectbox(
    "Season", list(seasons.loc[seasons["competition"] == competition, "season"])
)
st.sidebar.caption("Data: football-data.org")

table_tab, results_tab, team_tab = st.tabs(["Table", "Results", "Team form"])

with table_tab:
    table = queries.standings(engine, competition, season)
    if table.empty:
        st.info("No finished matches yet for this season.")
    else:
        summary = season_summary(table)
        cards = st.columns(4)
        cards[0].metric(f"Leader ({summary['leader_points']} pts)", summary["leader"])
        cards[1].metric(
            f"Best attack ({summary['best_attack_goals']} goals)", summary["best_attack"]
        )
        cards[2].metric(
            f"Best defense ({summary['best_defense_goals']} conceded)",
            summary["best_defense"],
        )
        cards[3].metric(
            f"Goals per match ({summary['matches_played']} played)",
            f"{summary['goals_per_match']:.2f}",
        )

        ranked = table.copy()
        ranked.insert(0, "#", range(1, len(ranked) + 1))
        st.dataframe(
            ranked.style.apply(zone_style, axis=1, teams=len(ranked)),
            hide_index=True,
        )
        if len(ranked) >= MIN_TEAMS_FOR_ZONES:
            st.caption(f"Shaded rows: top {TOP_ZONE_ROWS} and bottom {BOTTOM_ZONE_ROWS} of the table.")
        st.caption(
            "Ties are broken by goal difference, then goals scored. "
            "Official head-to-head rules are not applied."
        )

with results_tab:
    matches = queries.season_matches(engine, competition, season)
    matchdays = sorted(matches["matchday"].dropna().astype(int).unique())
    if not matchdays:
        st.info("No matches for this season.")
    else:
        played = matches.loc[matches["status"] == "FINISHED", "matchday"].dropna()
        default = len(matchdays) - 1 if played.empty else matchdays.index(int(played.max()))
        matchday = st.selectbox("Matchday", matchdays, index=default)
        shown = matches[matches["matchday"] == matchday].copy()
        shown["score"] = [
            "-" if pd.isna(h) else f"{int(h)}-{int(a)}"
            for h, a in zip(shown["home_goals"], shown["away_goals"])
        ]
        shown["date"] = pd.to_datetime(shown["utc_date"]).dt.strftime("%Y-%m-%d %H:%M")
        st.dataframe(
            shown[["date", "home", "score", "away", "status"]],
            hide_index=True,
        )

with team_tab:
    teams = queries.list_teams(engine, competition, season)
    if teams.empty:
        st.info("No teams for this season.")
    else:
        names = dict(zip(teams["id"], teams["name"]))
        team_id = st.selectbox("Team", list(names), format_func=names.get)
        form = queries.team_results(engine, competition, season, int(team_id))
        if form.empty:
            st.info("This team has no finished matches yet.")
        else:
            st.subheader("Points after each match")
            st.line_chart(form.set_index("matchday")["cumulative_points"], color=PRIMARY_COLOR)
            st.dataframe(
                form[["matchday", "opponent", "home", "goals_for", "goals_against", "result"]],
                hide_index=True,
            )
