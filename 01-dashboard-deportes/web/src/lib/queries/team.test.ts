import { afterAll, beforeEach, describe, expect, test } from "vitest";
import {
  resetTestDatabase,
  seedMatchStatsFixture,
  seedPlayersFixture,
  seedStandingsFixture,
  testSql,
} from "../../../tests/helpers/test-db";
import {
  getAdvancedStats,
  getSquad,
  getTeamMatches,
  getTeamProfile,
  getTeamSeasons,
} from "@/lib/queries/team";

const sql = testSql();

beforeEach(async () => {
  await resetTestDatabase(sql);
  await seedStandingsFixture(sql);
  await seedPlayersFixture(sql);
  await seedMatchStatsFixture(sql);
});

afterAll(async () => {
  await sql.end();
});

describe("getTeamProfile", () => {
  test("test_get_team_profile_and_unknown_team_is_null", async () => {
    expect(await getTeamProfile(sql, 1)).toEqual({
      id: 1,
      name: "A",
      shortName: "A",
      tla: "AAA",
      crest: "https://crests.football-data.org/1.png",
      founded: 1900,
      venue: "Estadio A",
      clubColors: "Azul / Blanco",
      website: null,
      coach: "Míster A",
    });
    expect(await getTeamProfile(sql, 999)).toBeNull();
  });

  test("test_profile_short_name_falls_back_to_name", async () => {
    const p = await getTeamProfile(sql, 3);
    expect(p?.shortName).toBe("C");
    expect(p?.tla).toBeNull();
  });
});

describe("getTeamSeasons", () => {
  test("test_get_team_seasons_newest_first_and_only_that_competition", async () => {
    await sql`
      INSERT INTO matches (id, competition, season, matchday, utc_date, status,
        home_team_id, away_team_id, home_goals, away_goals)
      VALUES
        (20, 'PD', 2025, 1, '2025-08-15T18:00:00Z', 'SCHEDULED', 1, 3, NULL, NULL),
        (21, 'PL', 2023, 1, '2023-08-15T18:00:00Z', 'FINISHED', 1, 2, 1, 0)`;
    expect(await getTeamSeasons(sql, "PD", 1)).toEqual([2025, 2024]);
    expect(await getTeamSeasons(sql, "PL", 1)).toEqual([2023]);
    expect(await getTeamSeasons(sql, "PD", 999)).toEqual([]);
  });
});

describe("getTeamMatches", () => {
  test("test_get_team_matches_includes_unplayed_in_date_order", async () => {
    const rows = await getTeamMatches(sql, "PD", 2024, 1);
    expect(rows.map((m) => m.id)).toEqual([1, 3, 4]);
    expect(rows[2]!.status).toBe("SCHEDULED");
    expect(rows[2]!.homeGoals).toBeNull();
    expect(rows[1]!.home.shortName).toBe("C");
  });
});

describe("getSquad", () => {
  test("test_get_squad_comes_from_squad_members_of_that_season", async () => {
    const squad = await getSquad(sql, 2024, 1);
    expect(squad.map((p) => p.name)).toEqual(["Ana Gol", "Ciro Muro", "Dani Nadie"]);
    expect(squad[0]).toMatchObject({
      id: 10,
      position: "Centre-Forward",
      nationality: "Spain",
    });
    expect(await getSquad(sql, 2025, 1)).toEqual([]);
  });

  test("test_squad_keeps_null_fields", async () => {
    const squad = await getSquad(sql, 2024, 1);
    const dani = squad.find((p) => p.id === 13)!;
    expect(dani.position).toBeNull();
    expect(dani.nationality).toBeNull();
    expect(dani.dateOfBirth).toBeNull();
    const ana = squad.find((p) => p.id === 10)!;
    expect(ana.dateOfBirth).toBeInstanceOf(Date);
  });
});

describe("getAdvancedStats", () => {
  test("test_advanced_stats_average_only_matches_with_each_value", async () => {
    const s = await getAdvancedStats(sql, "PD", 2024, 1);
    expect(s).toEqual({
      matchesWithStats: 2,
      matchesWithXg: 1,
      xgFor: 1.8,
      xgAgainst: 0.9,
      shots: 15,
      shotsOnTarget: 7.5,
      corners: 7.5,
      fouls: 9.5,
      yellow: 1,
      red: 0,
    });
  });

  test("test_advanced_stats_use_the_teams_side", async () => {
    const s = await getAdvancedStats(sql, "PD", 2024, 3);
    expect(s.matchesWithStats).toBe(1);
    expect(s.shots).toBe(5);
    expect(s.xgFor).toBeNull();
    expect(s.matchesWithXg).toBe(0);
  });

  test("test_advanced_stats_without_rows_are_null", async () => {
    const s = await getAdvancedStats(sql, "PD", 2025, 2);
    expect(s).toEqual({
      matchesWithStats: 0,
      matchesWithXg: 0,
      xgFor: null,
      xgAgainst: null,
      shots: null,
      shotsOnTarget: null,
      corners: null,
      fouls: null,
      yellow: null,
      red: null,
    });
  });

  test("test_xg_is_a_javascript_number", async () => {
    const s = await getAdvancedStats(sql, "PD", 2024, 1);
    expect(typeof s.xgFor).toBe("number");
    expect(typeof s.shots).toBe("number");
  });
});
