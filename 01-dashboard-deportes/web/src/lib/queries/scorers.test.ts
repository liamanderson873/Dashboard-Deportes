import { afterAll, beforeEach, describe, expect, test } from "vitest";
import {
  resetTestDatabase,
  seedPlayersFixture,
  seedStandingsFixture,
  testSql,
} from "../../../tests/helpers/test-db";
import { getScorers } from "@/lib/queries/scorers";

const sql = testSql();

beforeEach(async () => {
  await resetTestDatabase(sql);
  await seedStandingsFixture(sql);
  await seedPlayersFixture(sql);
});

afterAll(async () => {
  await sql.end();
});

describe("getScorers", () => {
  test("test_get_scorers_orders_by_goals_then_assists_then_name", async () => {
    const rows = await getScorers(sql, "PD", 2024);
    expect(rows.map((r) => r.player)).toEqual(["Ana Gol", "Beto Pase", "Dani Nadie"]);
    expect(rows[0]).toEqual({
      rank: 1,
      playerId: 10,
      player: "Ana Gol",
      position: "Centre-Forward",
      nationality: "Spain",
      team: {
        id: 1,
        name: "A",
        shortName: "A",
        tla: "AAA",
        crest: "https://crests.football-data.org/1.png",
      },
      goals: 7,
      assists: 2,
      penalties: 1,
      playedMatches: 2,
    });
  });

  test("test_ranks_are_shared_on_equal_goals", async () => {
    const rows = await getScorers(sql, "PD", 2024);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  test("test_null_assists_and_penalties_stay_null", async () => {
    const rows = await getScorers(sql, "PD", 2024);
    expect(rows[1].assists).toBeNull();
    expect(rows[1].penalties).toBeNull();
    expect(rows[2].position).toBeNull();
  });

  test("test_scorers_of_another_season_are_excluded", async () => {
    await sql`
      INSERT INTO scorers (competition, season, player_id, team_id, goals)
      VALUES ('PD', 2023, 12, 1, 30), ('PL', 2024, 12, 1, 30)`;
    const rows = await getScorers(sql, "PD", 2024);
    expect(rows.map((r) => r.playerId)).toEqual([10, 11, 13]);
  });

  test("test_limit_is_applied", async () => {
    const rows = await getScorers(sql, "PD", 2024, 2);
    expect(rows.map((r) => r.playerId)).toEqual([10, 11]);
  });

  test("test_numbers_are_javascript_numbers", async () => {
    const [first] = await getScorers(sql, "PD", 2024);
    for (const v of [first.rank, first.goals, first.assists, first.penalties, first.playedMatches]) {
      expect(typeof v).toBe("number");
    }
  });

  test("test_scorer_without_team_has_null_team", async () => {
    await sql`UPDATE scorers SET team_id = NULL WHERE player_id = 13`;
    const rows = await getScorers(sql, "PD", 2024);
    expect(rows[2].team).toBeNull();
  });
});
