import { it, expect } from "vitest";
import {
  trendValue,
  shotZone,
  zoneSummary,
  type TrendLine,
} from "./nba-trends";
import { forecastMetrics } from "./nba-history";
import type { ForecastRecord } from "./queries/nba-lab";
it("weights shooting percentages by attempts and preserves missing values", () => {
  const lines: TrendLine[] = [
    { gameId: "1", date: "2026-11-01", metrics: { fgm: 1, fg3m: 0, fga: 2 } },
    { gameId: "2", date: "2026-11-02", metrics: { fgm: 2, fg3m: 1, fga: 10 } },
  ];
  expect(trendValue(lines, "efg_pct")).toBeCloseTo((100 * 3.5) / 12);
  expect(trendValue(lines, "pts")).toBeNull();
  expect(trendValue([], "off_est")).toBeNull();
});
it("derives team possession ratings from both sides and team minutes", () => {
  const m = { pts: 100, fga: 80, fta: 20, oreb: 10, tov: 10, min: 240 },
    o = { ...m, pts: 90 };
  const line = { gameId: "1", date: "2026-11-01", metrics: m, opponent: o };
  expect(trendValue([line], "off_est")).toBeCloseTo(10000 / 88.8);
  expect(trendValue([line], "pace_est")).toBeCloseTo(88.8);
});
it("uses explicit zone boundaries and retains missed shots", () => {
  expect(shotZone({ distance: 23, value: 3, x: 23, y: 5 })).toBe("corner");
  expect(shotZone({ distance: 28, value: 3, x: 2, y: 27 })).toBe("arc");
  expect(shotZone({ distance: 38, value: 3, x: 2, y: 38 })).toBe("heave");
  const zone = zoneSummary([
    {
      id: 1,
      gameId: "1",
      playerId: 1,
      teamId: 1,
      x: 0,
      y: 2,
      distance: 2,
      period: 1,
      seconds: 30,
      value: 2,
      made: 0,
      probability: 0.7,
    },
  ]).find((z) => z.zone === "rim")!;
  expect(zone.n).toBe(1);
  expect(zone.made).toBe(0);
  expect(zone.expected).toBe(0.7);
});
it("evaluates only resolved auditable records without inventing an empty zero score", () => {
  const row = {
    gameId: "1",
    date: "2026-11-10",
    homeId: 1,
    awayId: 2,
    homePts: 110,
    awayPts: 100,
    status: "finished",
    probability: 0.8,
    created: "2026-11-09",
    cutoff: "2026-11-08",
    modelVersion: "x",
  } satisfies ForecastRecord;
  expect(forecastMetrics([{ ...row, status: "scheduled" }])).toBeNull();
  expect(
    forecastMetrics([{ ...row, created: "2026-11-10T18:00:00Z" }]),
  ).toBeNull();
  const m = forecastMetrics([row, { ...row, status: "scheduled" }])!;
  expect(m.n).toBe(1);
  expect(m.brier).toBeCloseTo(0.04);
  expect(m.logLoss).toBeCloseTo(-Math.log(0.8));
});
