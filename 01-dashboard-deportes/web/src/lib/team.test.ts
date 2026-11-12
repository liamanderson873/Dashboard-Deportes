import { describe, expect, test } from "vitest";
import type { MatchRow, TeamRef } from "@/lib/matches";
import {
  ageOn,
  parseTeamId,
  pointsProgression,
  positionGroup,
  splitRecord,
  toTeamMatches,
} from "@/lib/team";

const ref = (id: number): TeamRef => ({
  id,
  name: `T${id}`,
  shortName: `T${id}`,
  tla: null,
  crest: null,
});

function match(
  id: number,
  matchday: number | null,
  home: number,
  away: number,
  hg: number | null,
  ag: number | null,
  status = "FINISHED",
): MatchRow {
  return {
    id,
    matchday,
    utcDate: new Date(Date.UTC(2024, 7, id + 10)),
    status,
    home: ref(home),
    away: ref(away),
    homeGoals: hg,
    awayGoals: ag,
    homeHtGoals: null,
    awayHtGoals: null,
  };
}

const matches = [
  match(1, 1, 1, 2, 2, 1),
  match(2, 2, 2, 3, 1, 1),
  match(3, 3, 3, 1, 0, 3),
  match(4, 4, 1, 2, null, null, "SCHEDULED"),
];

describe("toTeamMatches", () => {
  test("test_to_team_matches_sets_side_opponent_and_result", () => {
    const tm = toTeamMatches([matches[0]!, matches[2]!, matches[3]!], 1);
    expect(tm[0]).toMatchObject({
      isHome: true,
      goalsFor: 2,
      goalsAgainst: 1,
      result: "W",
    });
    expect(tm[0]!.opponent.id).toBe(2);
    expect(tm[1]).toMatchObject({
      isHome: false,
      goalsFor: 3,
      goalsAgainst: 0,
      result: "W",
    });
    expect(tm[1]!.opponent.id).toBe(3);
    expect(tm[2]).toMatchObject({
      isHome: true,
      goalsFor: null,
      goalsAgainst: null,
      result: null,
    });
  });
});

describe("pointsProgression", () => {
  test("test_points_progression_is_cumulative_and_skips_unplayed", () => {
    const tm = toTeamMatches([matches[0]!, matches[2]!, matches[3]!], 1);
    expect(pointsProgression(tm)).toEqual([
      { points: 3, cumulative: 3 },
      { points: 3, cumulative: 6 },
    ]);
  });
});

describe("positionGroup", () => {
  test("test_position_group_for_every_known_position", () => {
    const cases: [string | null, string][] = [
      ["Goalkeeper", "goalkeepers"],
      ["Centre-Back", "defenders"],
      ["Left-Back", "defenders"],
      ["Right-Back", "defenders"],
      ["Defence", "defenders"],
      ["Defensive Midfield", "midfielders"],
      ["Central Midfield", "midfielders"],
      ["Attacking Midfield", "midfielders"],
      ["Left Midfield", "midfielders"],
      ["Right Midfield", "midfielders"],
      ["Midfield", "midfielders"],
      ["Left Winger", "forwards"],
      ["Right Winger", "forwards"],
      ["Centre-Forward", "forwards"],
      ["Offence", "forwards"],
      [null, "unknown"],
      ["Coach", "unknown"],
    ];
    for (const [pos, group] of cases) expect(positionGroup(pos)).toBe(group);
  });
});

describe("ageOn", () => {
  const on = new Date(Date.UTC(2024, 5, 15));
  test("test_age_on_before_and_after_birthday_and_null", () => {
    expect(ageOn(new Date(Date.UTC(2000, 5, 16)), on)).toBe(23);
    expect(ageOn(new Date(Date.UTC(2000, 5, 15)), on)).toBe(24);
    expect(ageOn(new Date(Date.UTC(2000, 5, 14)), on)).toBe(24);
    expect(ageOn(null, on)).toBeNull();
  });
});

describe("splitRecord", () => {
  test("test_split_record_all_home_away", () => {
    const tm = toTeamMatches([matches[0]!, matches[2]!, matches[3]!], 1);
    expect(splitRecord(tm, "all")).toEqual({
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      goalsFor: 5,
      goalsAgainst: 1,
      points: 6,
    });
    expect(splitRecord(tm, "home")).toMatchObject({ played: 1, goalsFor: 2, points: 3 });
    expect(splitRecord(tm, "away")).toMatchObject({
      played: 1,
      goalsFor: 3,
      goalsAgainst: 0,
    });
    const t2 = toTeamMatches([matches[0]!, matches[1]!, matches[3]!], 2);
    expect(splitRecord(t2, "all")).toMatchObject({
      played: 2,
      won: 0,
      drawn: 1,
      lost: 1,
      points: 1,
    });
  });
});

describe("parseTeamId", () => {
  test("test_parse_team_id_rejects_bad_input", () => {
    for (const bad of ["abc", "12abc", "-1", "0", "", "999999999999"]) {
      expect(parseTeamId(bad)).toBeNull();
    }
    expect(parseTeamId("86")).toBe(86);
  });
});
