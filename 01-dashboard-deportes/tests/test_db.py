from sqlalchemy import inspect, text

from sports_dashboard.db import init_schema


def test_init_schema_creates_tables_and_is_idempotent(engine):
    init_schema(engine)
    init_schema(engine)

    assert {"teams", "matches"} <= set(inspect(engine).get_table_names())


def test_matches_table_has_expected_columns(engine):
    init_schema(engine)

    columns = {c["name"] for c in inspect(engine).get_columns("matches")}

    assert columns == {
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
    }


def test_teams_table_has_profile_columns(engine):
    init_schema(engine)

    columns = {c["name"] for c in inspect(engine).get_columns("teams")}

    assert columns == {
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
    }


def test_new_tables_exist(engine):
    init_schema(engine)

    assert {"competitions", "players", "scorers", "match_stats"} <= set(
        inspect(engine).get_table_names()
    )


def test_squad_members_table_has_expected_columns(engine):
    init_schema(engine)

    columns = {c["name"] for c in inspect(engine).get_columns("squad_members")}

    assert columns == {"season", "team_id", "player_id"}


def test_init_schema_upgrades_a_phase1_database_without_losing_rows(engine):
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"))
        conn.execute(
            text(
                "CREATE TABLE matches (id INTEGER PRIMARY KEY, competition TEXT NOT NULL, "
                "season INTEGER NOT NULL, matchday INTEGER, utc_date TIMESTAMPTZ NOT NULL, "
                "status TEXT NOT NULL, home_team_id INTEGER NOT NULL REFERENCES teams (id), "
                "away_team_id INTEGER NOT NULL REFERENCES teams (id), "
                "home_goals INTEGER, away_goals INTEGER)"
            )
        )
        conn.execute(text("INSERT INTO teams (id, name) VALUES (1, 'A')"))

    init_schema(engine)

    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, name FROM teams")).all()
    assert rows == [(1, "A")]
    assert "short_name" in {c["name"] for c in inspect(engine).get_columns("teams")}
