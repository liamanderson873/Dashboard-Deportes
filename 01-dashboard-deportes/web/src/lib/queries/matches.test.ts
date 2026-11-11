import { afterAll, beforeEach, describe, expect, test } from "vitest";
import {
  resetTestDatabase,
  seedStandingsFixture,
  testSql,
} from "../../../tests/helpers/test-db";
import { getMatchdays, getMatchesByMatchday } from "@/lib/queries/matches";

const sql = testSql();

beforeEach(async () => {
  await resetTestDatabase(sql);
  await seedStandingsFixture(sql);
  // matches 1 and 2 share matchday 1; 3 is matchday 2; 4 (scheduled) matchday 3
  await sql`UPDATE matches SET matchday = 1 WHERE id IN (1, 2)`;
  await sql`UPDATE matches SET matchday = 2 WHERE id = 3`;
  await sql`UPDATE matches SET matchday = 3 WHERE id = 4`;
});

afterAll(async () => {
  await sql.end();
});

describe("getMatchdays", () => {
  test("test_get_matchdays_counts_total_and_played", async () => {
    expect(await getMatchdays(sql, "PD", 2024)).toEqual([
      { matchday: 1, total: 2, played: 2 },
      { matchday: 2, total: 1, played: 1 },
      { matchday: 3, total: 1, played: 0 },
    ]);
  });

  test("test_null_matchday_is_ignored_in_matchdays", async () => {
    await sql`UPDATE matches SET matchday = NULL WHERE id = 4`;
    const days = await getMatchdays(sql, "PD", 2024);
    expect(days.map((d) => d.matchday)).toEqual([1, 2]);
  });

  test("test_matches_of_another_competition_are_excluded", async () => {
    await sql`
      INSERT INTO matches (id, competition, season, matchday, utc_date, status,
        home_team_id, away_team_id, home_goals, away_goals)
      VALUES (9, 'PL', 2024, 7, '2024-09-01T18:00:00Z', 'FINISHED', 1, 2, 1, 0)`;
    expect((await getMatchdays(sql, "PD", 2024)).map((d) => d.matchday)).toEqual([1, 2, 3]);
    expect(await getMatchesByMatchday(sql, "PD", 2024, 7)).toEqual([]);
  });
});

describe("getMatchesByMatchday", () => {
  test("test_get_matches_by_matchday_returns_teams_and_scores", async () => {
    const rows = await getMatchesByMatchday(sql, "PD", 2024, 1);
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
    expect(rows[0].home).toEqual({
      id: 1,
      name: "A",
      shortName: "A",
      tla: "AAA",
      crest: "https://crests.football-data.org/1.png",
    });
    expect(rows[0].homeGoals).toBe(2);
    expect(rows[0].awayGoals).toBe(1);
    expect(rows[0].utcDate).toBeInstanceOf(Date);
    // team C has no crest, tla or short_name
    expect(rows[1].away).toEqual({ id: 3, name: "C", shortName: "C", tla: null, crest: null });
    expect(rows[0].homeHtGoals).toBeNull();
  });

  test("test_scheduled_match_has_null_goals_and_is_listed", async () => {
    const rows = await getMatchesByMatchday(sql, "PD", 2024, 3);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("SCHEDULED");
    expect(rows[0].homeGoals).toBeNull();
    expect(rows[0].awayGoals).toBeNull();
  });
});
