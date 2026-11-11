import io
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy import text

from conftest import TEST_DATABASE_URL
from sports_dashboard.db import init_schema
from sports_dashboard.stats_import import (
    AliasFileError,
    UnmappedTeamError,
    import_stats,
    load_aliases,
    main,
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


REFEREE_CSV = "HomeTeam,AwayTeam,Referee\nA,B,Clément Turpin\n"


def test_parse_stats_csv_reads_utf8_with_bom(tmp_path):
    path = tmp_path / "bom.csv"
    path.write_bytes(REFEREE_CSV.encode("utf-8-sig"))
    df = parse_stats_csv(path)
    assert df.iloc[0]["home_name"] == "A"
    assert df.iloc[0]["referee"] == "Clément Turpin"


def test_parse_stats_csv_falls_back_to_latin1(tmp_path):
    path = tmp_path / "latin.csv"
    path.write_bytes(REFEREE_CSV.encode("latin-1"))
    assert parse_stats_csv(path).iloc[0]["referee"] == "Clément Turpin"


def test_parse_stats_csv_turns_non_integer_counts_into_nulls():
    source = io.StringIO("HomeTeam,AwayTeam,HS,HST,HC,HxG\nA,B,1.5,4,3.0,1.25\n")
    row = parse_stats_csv(source).iloc[0]
    assert pd.isna(row["home_shots"])
    assert row["home_shots_on_target"] == 4
    assert row["home_corners"] == 3
    assert row["home_xg"] == pytest.approx(1.25)


def test_resolve_team_ids_reports_ambiguous_names_unless_aliased(seeded):
    with seeded.begin() as conn:
        conn.execute(text("UPDATE teams SET short_name = 'Twin' WHERE id IN (1, 2)"))
        conn.execute(text("UPDATE teams SET short_name = 'C' WHERE id = 3"))
    with pytest.raises(UnmappedTeamError) as exc:
        resolve_team_ids(["Twin", "C"], seeded, {})
    assert exc.value.names == ["Twin"]
    assert resolve_team_ids(["Twin", "C"], seeded, {"twin": 2}) == {"Twin": 2, "C": 3}


def test_main_lists_every_unmapped_name_sorted_and_imports_nothing(
    engine, tmp_path, monkeypatch, capsys
):
    init_schema(engine)
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO teams (id, name) VALUES (1, 'A')"))
    season = tmp_path / "2627"
    season.mkdir()
    (season / "SP1.csv").write_text(
        SAMPLE.read_text(encoding="utf-8").replace("B", "Zeta").replace("C", "Alpha"),
        encoding="utf-8",
    )
    aliases = tmp_path / "aliases.csv"
    aliases.write_text("alias,team_id\n", encoding="utf-8")
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    code = main(["--folder", str(tmp_path), "--aliases", str(aliases)])
    names = [line for line in capsys.readouterr().err.splitlines() if line in {"Alpha", "Zeta"}]
    assert code == 1
    assert names == ["Alpha", "Zeta"]
    assert _stats_rows(engine) == []


def _run_main(engine, tmp_path, monkeypatch, capsys, aliases_text, csv_text=None):
    """Run main on a one-file folder. Returns (exit code, stderr)."""
    init_schema(engine)
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO teams (id, name) VALUES (1, 'A'), (2, 'B')"))
        conn.execute(
            text(
                "INSERT INTO matches (id, competition, season, matchday, utc_date, status, "
                "home_team_id, away_team_id) VALUES "
                "(1, 'PD', 2026, 1, '2026-08-15T19:00:00Z', 'FINISHED', 1, 2)"
            )
        )
    season = tmp_path / "2627"
    season.mkdir()
    (season / "SP1.csv").write_text(
        csv_text or "HomeTeam,AwayTeam,HS\nA,B,7\n", encoding="utf-8"
    )
    aliases = tmp_path / "aliases.csv"
    if aliases_text is not None:
        aliases.write_text(aliases_text, encoding="utf-8")
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    code = main(["--folder", str(tmp_path), "--aliases", str(aliases)])
    return code, capsys.readouterr().err


def test_main_prints_each_unmatched_pair_to_stderr(engine, tmp_path, monkeypatch, capsys):
    csv = "HomeTeam,AwayTeam,HS\nA,B,7\nB,A,3\n"
    code, err = _run_main(engine, tmp_path, monkeypatch, capsys, "alias,team_id\n", csv)
    assert code == 0
    assert "  B - A" in err.splitlines()
    assert [row[0] for row in _stats_rows(engine)] == [1]


def test_load_aliases_lists_every_bad_line_in_one_message(tmp_path):
    path = tmp_path / "aliases.csv"
    path.write_text("alias,team_id\nOk,1\n,2\nNoId,\nWord,abc\n", encoding="utf-8")
    with pytest.raises(AliasFileError) as exc:
        load_aliases(path)
    message = str(exc.value)
    assert isinstance(exc.value, ValueError)
    assert "line 3:" in message and "line 4:" in message and "line 5:" in message
    assert "line 2:" not in message


@pytest.mark.parametrize(
    "aliases_text, expected",
    [
        ("alias,team_id\n,1\n", ["line 2:"]),
        ("alias,team_id\nFoo,\n", ["line 2:"]),
        ("alias,team_id\nFoo,xyz\nBar,1\nBaz,\n", ["line 2:", "line 4:"]),
        ("alias,team_id\nFoo,1\nBar,99\nBaz,98\n", ["line 3:", "line 4:", "99", "98"]),
    ],
)
def test_main_reports_alias_file_problems_with_line_numbers(
    engine, tmp_path, monkeypatch, capsys, aliases_text, expected
):
    code, err = _run_main(engine, tmp_path, monkeypatch, capsys, aliases_text)
    assert code == 1
    assert err.startswith("Error:")
    for fragment in expected:
        assert fragment in err
    assert "Traceback" not in err
    assert _stats_rows(engine) == []


def test_main_reports_a_missing_aliases_file(engine, tmp_path, monkeypatch, capsys):
    code, err = _run_main(engine, tmp_path, monkeypatch, capsys, None)
    assert code == 1
    assert "aliases.csv" in err and "Traceback" not in err


def test_main_reports_a_malformed_csv_file(engine, tmp_path, monkeypatch, capsys):
    csv = "HomeTeam,AwayTeam,HS\nA,B,7\nA,B,1,2,3,4\n"
    code, err = _run_main(engine, tmp_path, monkeypatch, capsys, "alias,team_id\n", csv)
    assert code == 1
    assert "SP1.csv" in err and "Traceback" not in err
