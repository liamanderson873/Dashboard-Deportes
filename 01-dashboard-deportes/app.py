import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import pandas as pd  # noqa: E402
import streamlit as st  # noqa: E402

from sports_dashboard import queries  # noqa: E402
from sports_dashboard.config import ConfigError, load_database_url  # noqa: E402
from sports_dashboard.db import get_engine, init_schema  # noqa: E402

COMPETITION_NAMES = {"PD": "LaLiga", "PL": "Premier League"}

st.set_page_config(page_title="Football dashboard", layout="wide")
st.title("Football dashboard")


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
        st.dataframe(table, hide_index=True, use_container_width=True)
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
            use_container_width=True,
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
            st.line_chart(form.set_index("matchday")["cumulative_points"])
            st.dataframe(
                form[["matchday", "opponent", "home", "goals_for", "goals_against", "result"]],
                hide_index=True,
                use_container_width=True,
            )
