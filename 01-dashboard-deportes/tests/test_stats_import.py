import io
from pathlib import Path

import pytest
from sqlalchemy import text

from sports_dashboard.stats_import import (
    UnmappedTeamError,
    import_stats,
    load_aliases,
    normalize_name,
    parse_stats_csv,
    resolve_team_ids,
    season_from_folder,
)

SAMPLE = Path(__file__).parent / "fixtures" / "co_uk_sample.csv"


def test_season_from_folder():
    assert season_from_folder("2627") == 2026
    assert season_from_folder("2425") == 2024


def test_normalize_name_ignores_case_accents_and_punctuation():
    assert normalize_name("  Ath.  Bilbao ") == "ath bilbao"
    assert normalize_name("Alavés") == "alaves"
    assert normalize_name("Man   City") == normalize_name("man city")


def test_parse_stats_csv_ignores_blank_lines_and_reads_numbers():
    df = parse_stats_csv(SAMPLE)
    assert len(df) == 3
    first = df.iloc[0]
    assert (first["home_name"], first["away_name"]) == ("A", "B")
    assert first["home_xg"] == pytest.approx(1.85)
    assert first["away_shots"] == 8
    assert first["home_shots_on_target"] == 6
    assert first["home_corners"] == 7
    assert first["away_fouls"] == 15
    assert first["away_yellow"] == 3
    assert first["away_red"] == 1
    assert first["referee"] == "Referee One"
    assert df["home_xg"].isna().tolist() == [False, False, True]


def test_parse_stats_csv_without_xg_columns_gives_nulls():
    source = io.StringIO("HomeTeam,AwayTeam,HS,AS\nA,B,10,4\n,,,\n")
    df = parse_stats_csv(source)
    assert len(df) == 1
    assert df["home_xg"].isna().all() and df["away_xg"].isna().all()
    assert df["referee"].isna().all()
    assert df.iloc[0]["home_shots"] == 10


def test_resolve_team_ids_uses_aliases_and_exact_names(seeded):
    with seeded.begin() as conn:
        conn.execute(text("UPDATE teams SET short_name = 'Bee' WHERE id = 2"))
    ids = resolve_team_ids(["A", "bee", "Team C"], seeded, {normalize_name("Team C"): 3})
    assert ids == {"A": 1, "bee": 2, "Team C": 3}


def test_resolve_team_ids_reports_every_unmapped_name_at_once(seeded):
    with pytest.raises(UnmappedTeamError) as exc:
        resolve_team_ids(["Zeta", "A", "Omega", "Zeta"], seeded, {})
    assert exc.value.names == ["Omega", "Zeta"]


def test_load_aliases_reads_normalized_keys_and_header_only_file(tmp_path):
    path = tmp_path / "aliases.csv"
    path.write_text("alias,team_id\n", encoding="utf-8")
    assert load_aliases(path) == {}
    path.write_text("alias,team_id\nAth. Madrid,3\n", encoding="utf-8")
    assert load_aliases(path) == {"ath madrid": 3}


@pytest.fixture
def league(seeded):
    """The seeded matches minus the extra A-B fixture: one match per ordered pair."""
    with seeded.begin() as conn:
        conn.execute(text("DELETE FROM matches WHERE id = 4"))
    return seeded


def _stats_rows(engine):
    with engine.connect() as conn:
        return conn.execute(
            text("SELECT match_id, home_shots, referee FROM match_stats ORDER BY match_id")
        ).all()


def test_import_stats_upserts_and_is_idempotent(league):
    first = import_stats(league, SAMPLE, "PD", 2024, {})
    second = import_stats(league, SAMPLE, "PD", 2024, {})
    assert first.matched == 3 and first.unmatched == []
    assert second.matched == 3
    assert _stats_rows(league) == [
        (1, 14, "Referee One"),
        (2, 9, "Referee Two"),
        (3, 5, "Referee Three"),
    ]
    with league.connect() as conn:
        xg = conn.execute(text("SELECT home_xg FROM match_stats WHERE match_id = 3")).scalar()
    assert xg is None


def test_import_stats_counts_matches_missing_from_the_database_as_unmatched(league):
    with league.begin() as conn:
        conn.execute(text("DELETE FROM matches WHERE id = 2"))
    result = import_stats(league, SAMPLE, "PD", 2024, {})
    assert result.matched == 2
    assert result.unmatched == ["B - C"]
    assert [row[0] for row in _stats_rows(league)] == [1, 3]


def test_import_stats_with_unmapped_team_imports_nothing(league, tmp_path):
    csv = tmp_path / "SP1.csv"
    csv.write_text(
        "HomeTeam,AwayTeam,HS,AS\nA,B,10,4\nNobody,C,3,3\n", encoding="utf-8"
    )
    with pytest.raises(UnmappedTeamError) as exc:
        import_stats(league, csv, "PD", 2024, {})
    assert exc.value.names == ["Nobody"]
    assert _stats_rows(league) == []
