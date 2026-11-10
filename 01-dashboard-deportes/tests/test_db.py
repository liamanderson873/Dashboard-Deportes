from sqlalchemy import inspect

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
    }
