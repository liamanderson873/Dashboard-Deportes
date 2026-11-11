import { afterAll, beforeEach, describe, expect, test } from "vitest";
import {
  resetTestDatabase,
  seedStandingsFixture,
  testSql,
} from "../../../tests/helpers/test-db";
import { getHeadToHead } from "@/lib/queries/head-to-head";

const sql = testSql();

beforeEach(async () => {
  await resetTestDatabase(sql);
  await seedStandingsFixture(sql);
});

afterAll(async () => {
  await sql.end();
});

describe("getHeadToHead", () => {
  test("test_head_to_head_returns_both_legs_newest_first", async () => {
    const rows = await getHeadToHead(sql, "PD", 1, 2);
    expect(rows.map((m) => m.id)).toEqual([4, 1]);
    expect(rows[1].home.name).toBe("A");
    expect(rows[1].homeGoals).toBe(2);
  });

  test("test_head_to_head_spans_seasons_but_not_competitions", async () => {
    await sql`
      INSERT INTO matches (id, competition, season, matchday, utc_date, status,
        home_team_id, away_team_id, home_goals, away_goals)
      VALUES
        (20, 'PD', 2023, 1, '2023-08-15T18:00:00Z', 'FINISHED', 2, 1, 0, 0),
        (21, 'PL', 2024, 1, '2024-08-15T18:00:00Z', 'FINISHED', 2, 1, 1, 1)`;
    const rows = await getHeadToHead(sql, "PD", 2, 1);
    expect(rows.map((m) => m.id)).toEqual([4, 1, 20]);
  });

  test("test_head_to_head_without_matches_is_empty", async () => {
    expect(await getHeadToHead(sql, "PD", 1, 999)).toEqual([]);
  });
});
