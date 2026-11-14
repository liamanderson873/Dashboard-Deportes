import { describe, it, expect } from "vitest";
import { numericAxis, shotDifficulty } from "./nba-visuals";
import {
  scatterCohort,
  scatterValue,
  parseScatterRules,
  serializeScatterRules,
  sortScatter,
} from "./nba-scatter";
import type { NbaPlayer } from "./nba";
const player = (
  id: number,
  metrics: NbaPlayer["metrics"],
  teamId = 10,
  position = "G",
): NbaPlayer => ({ id, name: `Player ${id}`, teamId, position, metrics });
describe("chart data contracts", () => {
  it("shows zero and readable upper ticks without clipping the largest value", () => {
    const a = numericAxis([null, undefined, NaN, 32, 37, 0]);
    expect(a.min).toBe(0);
    expect(a.max).toBe(40);
    expect(a.ticks).toEqual([0, 10, 20, 30, 40]);
  });
  it("preserves negative ratings and lets an explicitly fitted scale omit zero", () => {
    const a = numericAxis([-12, 18]);
    expect(a.min).toBeLessThanOrEqual(-12);
    expect(a.max).toBeGreaterThanOrEqual(18);
    expect(a.ticks).toContain(0);
    const fitted = numericAxis([58, 66], false);
    expect(fitted.min).toBeGreaterThan(0);
    expect(fitted.min).toBeLessThanOrEqual(58);
    expect(fitted.max).toBeGreaterThanOrEqual(66);
  });
  it("handles empty, all-zero and constant cohorts without division by zero", () => {
    for (const values of [[], [0, 0], [7, 7]]) {
      const a = numericAxis(values);
      expect(a.span).toBeGreaterThan(0);
      expect(a.ticks.every(Number.isFinite)).toBe(true);
      expect(a.ticks.length).toBeGreaterThan(1);
    }
  });
  it("maps low scoring probabilities to greater visual difficulty without inventing unknowns", () => {
    expect(shotDifficulty(0.2)).toBeCloseTo(0.8);
    expect(shotDifficulty(0.8)).toBeCloseTo(0.2);
    expect(shotDifficulty(null)).toBeNull();
    expect(shotDifficulty(NaN)).toBeNull();
    expect(shotDifficulty(1.1)).toBeNull();
  });
  it("uses display percentages for conditions while excluding missing axes and preserving zero", () => {
    const players = [
      player(1, { pts: 25, ts_pct: 0.65, gp: 10, min: 30 }),
      player(2, { pts: 24, ts_pct: 0.55, gp: 10, min: 30 }),
      player(3, { pts: 0, ts_pct: 0, gp: 10, min: 20 }),
      player(4, { pts: 30, ts_pct: null, gp: 10, min: 35 }),
    ];
    const filters = {
      team: "",
      position: "",
      minGames: 5,
      minMinutes: 15,
      rules: parseScatterRules("pts:gte:20|ts_pct:gte:60"),
    };
    expect(
      scatterCohort(players, "pts", "ts_pct", filters).points.map(
        (p) => p.player.id,
      ),
    ).toEqual([1]);
    expect(scatterValue(players[0], "ts_pct")).toBe(65);
    const all = scatterCohort(players, "pts", "ts_pct", {
      ...filters,
      rules: [],
    });
    expect(all.points.find((p) => p.player.id === 3)).toMatchObject({
      x: 0,
      y: 0,
    });
    expect(all.missing).toBe(1);
  });
  it("applies position, team and sample conditions together and sorts lower-is-better metrics correctly", () => {
    const players = [
      player(1, { ast: 8, tov: 2, gp: 10, min: 30 }),
      player(2, { ast: 4, tov: 1, gp: 2, min: 10 }),
      player(3, { ast: 5, tov: 3, gp: 10, min: 30 }, 20, "G-F"),
    ];
    const result = scatterCohort(players, "ast", "tov", {
      team: "10",
      position: "G",
      minGames: 5,
      minMinutes: 15,
      rules: [],
    });
    expect(result.points.map((p) => p.player.id)).toEqual([1]);
    const all = scatterCohort(players, "ast", "tov", {
      team: "",
      position: "",
      minGames: 0,
      minMinutes: 0,
      rules: [],
    });
    expect(sortScatter(all.points, "y", "tov").map((p) => p.player.id)).toEqual(
      [2, 1, 3],
    );
  });
  it("round-trips shared rules and rejects unrecognized, missing and nonfinite conditions", () => {
    const r = parseScatterRules("pts:gte:20|ts_pct:gte:60|net_rating:lte:-2");
    expect(parseScatterRules(serializeScatterRules(r))).toEqual(r);
    expect(
      parseScatterRules(
        "bad:gte:3|pts:bad:2|pts:gte:NaN|pts:gte:|pts:gte:Infinity",
      ),
    ).toEqual([]);
    expect(
      parseScatterRules(Array(20).fill("pts:gte:1").join("|")),
    ).toHaveLength(6);
  });
});
