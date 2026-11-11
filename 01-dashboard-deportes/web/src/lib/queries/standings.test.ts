import { afterAll, beforeEach, describe, expect, test } from "vitest";
import {
  resetTestDatabase,
  seedStandingsFixture,
  testSql,
} from "../../../tests/helpers/test-db";
import {
  getAvailableSeasons,
  getDefaultView,
  getStandings,
} from "@/lib/queries/standings";

const sql = testSql();

beforeEach(async () => {
  await resetTestDatabase(sql);
  await seedStandingsFixture(sql);
});

afterAll(async () => {
  await sql.end();
});

describe("getStandings", () => {
  test("test_get_standings_matches_the_python_results", async () => {
    const rows = await getStandings(sql, "PD", 2024);
    expect(rows.map((r) => r.team)).toEqual(["A", "B", "C"]);
    expect(rows.map((r) => r.points)).toEqual([6, 1, 1]);
    expect(rows.map((r) => r.goalDifference)).toEqual([4, -1, -3]);
    expect(rows.map((r) => r.played)).toEqual([2, 2, 2]);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  test("test_numbers_are_javascript_numbers", async () => {
    const [first] = await getStandings(sql, "PD", 2024);
    expect(typeof first.played).toBe("number");
    expect(typeof first.points).toBe("number");
    expect(typeof first.goalDifference).toBe("number");
    expect(typeof first.goalsFor).toBe("number");
  });

  test("test_unplayed_matches_do_not_count", async () => {
    const rows = await getStandings(sql, "PD", 2024);
    expect(rows.find((r) => r.team === "A")?.played).toBe(2);
    expect(rows.find((r) => r.team === "B")?.played).toBe(2);
  });

  test("test_awarded_matches_count_and_postponed_do_not", async () => {
    await sql`
      INSERT INTO matches
        (id, competition, season, matchday, utc_date, status,
         home_team_id, away_team_id, home_goals, away_goals)
      VALUES
        (5, 'PD', 2024, 5, '2024-09-12T18:00:00Z', 'AWARDED', 3, 1, 0, 3),
        (6, 'PD', 2024, 6, '2024-09-19T18:00:00Z', 'POSTPONED', 2, 3, NULL, NULL)`;
    const rows = await getStandings(sql, "PD", 2024);
    const a = rows.find((r) => r.team === "A");
    const c = rows.find((r) => r.team === "C");
    expect(a?.points).toBe(9);
    expect(a?.played).toBe(3);
    expect(a?.goalDifference).toBe(7);
    expect(c?.points).toBe(1);
    expect(c?.played).toBe(3);
  });

  test("test_form_lists_the_last_results_oldest_first", async () => {
    const rows = await getStandings(sql, "PD", 2024);
    expect(rows.find((r) => r.team === "A")?.form).toEqual(["W", "W"]);
    expect(rows.find((r) => r.team === "B")?.form).toEqual(["L", "D"]);
  });

  test("test_team_without_crest_has_null_crest", async () => {
    const rows = await getStandings(sql, "PD", 2024);
    const c = rows.find((r) => r.team === "C");
    expect(c?.crest).toBeNull();
    expect(c?.tla).toBeNull();
    expect(c?.shortName).toBe("C");
  });

  test("test_standings_of_an_unknown_season_is_empty", async () => {
    expect(await getStandings(sql, "PD", 1999)).toEqual([]);
  });
});

describe("getAvailableSeasons", () => {
  test("test_get_available_seasons_newest_first", async () => {
    await sql`
      INSERT INTO matches
        (id, competition, season, matchday, utc_date, status,
         home_team_id, away_team_id, home_goals, away_goals)
      VALUES (7, 'PD', 2025, 1, '2025-08-15T18:00:00Z', 'SCHEDULED', 1, 2, NULL, NULL)`;
    expect(await getAvailableSeasons(sql, "PD")).toEqual([2025, 2024]);
    expect(await getAvailableSeasons(sql, "PL")).toEqual([]);
  });
});

describe("getDefaultView", () => {
  test("test_get_default_view_prefers_the_latest_laliga_season", async () => {
    await sql`
      INSERT INTO matches
        (id, competition, season, matchday, utc_date, status,
         home_team_id, away_team_id, home_goals, away_goals)
      VALUES
        (7, 'PD', 2025, 1, '2025-08-15T18:00:00Z', 'SCHEDULED', 1, 2, NULL, NULL),
        (8, 'PL', 2026, 1, '2026-08-15T18:00:00Z', 'SCHEDULED', 1, 2, NULL, NULL)`;
    expect(await getDefaultView(sql)).toEqual({ competition: "PD", season: 2025 });
  });

  test("falls back to the first league that has matches", async () => {
    await sql`TRUNCATE matches CASCADE`;
    await sql`
      INSERT INTO matches
        (id, competition, season, matchday, utc_date, status,
         home_team_id, away_team_id, home_goals, away_goals)
      VALUES (9, 'SA', 2024, 1, '2024-08-15T18:00:00Z', 'SCHEDULED', 1, 2, NULL, NULL)`;
    expect(await getDefaultView(sql)).toEqual({ competition: "SA", season: 2024 });
  });

  test("test_get_default_view_is_null_without_matches", async () => {
    await sql`TRUNCATE matches CASCADE`;
    expect(await getDefaultView(sql)).toBeNull();
  });
});
