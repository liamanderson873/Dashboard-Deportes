import { describe, expect, test } from "vitest";
import { buildCompareRows, parseSelection } from "@/lib/compare";
import type { StandingRow } from "@/lib/standings";
import type { AdvancedStats } from "@/lib/queries/team";

const IDS = [1, 2, 3];

function standing(over: Partial<StandingRow> = {}): StandingRow {
  return {
    position: 1,
    teamId: 1,
    team: "A",
    shortName: "A",
    tla: "AAA",
    crest: null,
    played: 10,
    won: 6,
    drawn: 2,
    lost: 2,
    goalsFor: 20,
    goalsAgainst: 10,
    goalDifference: 10,
    points: 20,
    form: [],
    ...over,
  };
}

function adv(over: Partial<AdvancedStats> = {}): AdvancedStats {
  return {
    matchesWithStats: 10,
    matchesWithXg: 10,
    xgFor: 1.5,
    xgAgainst: 1,
    shots: 12,
    shotsOnTarget: 5,
    corners: 6,
    fouls: 11,
    yellow: 2,
    red: 0,
    ...over,
  };
}

const find = (rows: ReturnType<typeof buildCompareRows>, label: string) => {
  const r = rows.find((x) => x.label === label);
  if (!r) throw new Error(`missing row ${label}`);
  return r;
};

describe("parseSelection", () => {
  test("test_parse_selection_accepts_two_valid_teams", () => {
    expect(parseSelection("1", "2", IDS)).toEqual({ a: 1, b: 2, error: null });
  });

  test("test_parse_selection_flags_same_team", () => {
    expect(parseSelection("2", "2", IDS)).toEqual({ a: 2, b: null, error: "same" });
  });

  test("test_parse_selection_flags_unknown_team_and_bad_input", () => {
    expect(parseSelection("abc", "2", IDS)).toEqual({ a: null, b: 2, error: "unknown" });
    expect(parseSelection("1", "99", IDS)).toEqual({ a: 1, b: null, error: "unknown" });
    expect(parseSelection(undefined, undefined, IDS)).toEqual({
      a: null,
      b: null,
      error: null,
    });
    expect(parseSelection("", "2", IDS).a).toBeNull();
  });

  test("test_parse_selection_takes_first_of_array", () => {
    expect(parseSelection(["1", "3"], ["2"], IDS)).toEqual({ a: 1, b: 2, error: null });
  });
});

describe("buildCompareRows", () => {
  test("test_build_compare_rows_marks_better_side", () => {
    const a = { row: standing({ position: 3, goalsAgainst: 12 }), adv: adv() };
    const b = { row: standing({ position: 1, goalsAgainst: 20, points: 30 }), adv: adv() };
    const rows = buildCompareRows(a, b);
    expect(rows.map((r) => r.label)).toHaveLength(14);
    expect(rows[0].label).toBe("Posición");
    expect(find(rows, "Posición").better).toBe("b");
    expect(find(rows, "Goles en contra").better).toBe("a");
    expect(find(rows, "Puntos").better).toBe("b");
    expect(find(rows, "Partidos jugados").better).toBeNull();
    expect(find(rows, "Faltas por partido").better).toBeNull();
  });

  test("test_build_compare_rows_null_values_are_not_available_and_have_no_winner", () => {
    const a = { row: standing(), adv: adv({ xgFor: null, corners: null }) };
    const b = { row: standing(), adv: adv({ xgFor: 2, corners: 4 }) };
    const rows = buildCompareRows(a, b);
    const xg = find(rows, "xG a favor por partido");
    expect(xg.a).toBe("No disponible");
    expect(xg.b).toBe("2,00");
    expect(xg.better).toBeNull();
    expect(find(rows, "Córners por partido").better).toBeNull();
  });

  test("test_build_compare_rows_tie_has_no_winner", () => {
    const rows = buildCompareRows(
      { row: standing(), adv: adv() },
      { row: standing(), adv: adv() },
    );
    expect(rows.every((r) => r.better === null)).toBe(true);
  });
});
