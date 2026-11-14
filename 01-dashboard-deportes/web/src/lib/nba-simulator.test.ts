import { describe, it, expect } from "vitest";
import {
  simulateNba,
  seriesProbability,
  breakTie,
  randomSeed,
  type SimConfig,
  type SimGame,
} from "./nba-simulator";
function fixture(): SimConfig {
  const teams = Array.from({ length: 30 }, (_, i) => ({
    id: 100 + i,
    name: `Team ${i}`,
    abbreviation: `T${i}`,
    conference: i < 15 ? "Este" : "Oeste",
    division: `D${Math.floor(i / 5)}`,
    priorPct: 0.5,
    lastDate: "2026-10-19",
  }));
  const games: SimGame[] = [];
  let rotation = teams.map((t) => t.id),
    id = 0;
  const days: number[][][] = [];
  for (let round = 0; round < 29; round++) {
    days.push(
      Array.from({ length: 15 }, (_, i) => [rotation[i], rotation[29 - i]]),
    );
    rotation = [rotation[0], rotation.at(-1)!, ...rotation.slice(1, -1)];
  }
  for (let day = 0; day < 80; day++)
    for (const pair of days[day % 29]) {
      id++;
      const [h, a] = day % 2 ? pair : [pair[1], pair[0]];
      games.push({
        id: `00226${String(id).padStart(5, "0")}`,
        date: "2026-11-20",
        homeId: h,
        awayId: a,
        homePts: null,
        awayPts: null,
        status: "scheduled",
        overtime: false,
        probability: 0.5,
        margin: 0,
      });
    }
  const groups = Array.from({ length: 6 }, (_, i) => ({
    name: `${i < 3 ? "Este" : "Oeste"} ${i % 3}`,
    conference: i < 3 ? "Este" : "Oeste",
    teamIds: teams.slice(i * 5, i * 5 + 5).map((t) => t.id),
  }));
  const gameIds = games
    .slice(0, 435)
    .filter((g) =>
      groups.some(
        (group) =>
          group.teamIds.includes(g.homeId) && group.teamIds.includes(g.awayId),
      ),
    )
    .map((g) => g.id);
  const matrix = Array.from({ length: 30 }, () => Array(30).fill(0.5));
  return {
    version: 1,
    season: 2026,
    created: "2026-11-13",
    cutoff: "2026-11-12",
    modelVersion: "test",
    teams,
    games,
    matrices: {
      regular: matrix,
      playoffs: matrix,
      neutral: matrix,
      margin: Array.from({ length: 30 }, () => Array(30).fill(0)),
    },
    cup: { groups, gameIds, source: "fixture" },
    marginSD: 14,
    totalMean: 220,
    totalSD: 18,
    marginReport: {
      test_season: 2026,
      n: 10,
      mae: 10,
      rmse: 14,
      baseline_mae: 12,
    },
  };
}
describe("NBA full-season simulation", () => {
  it("preserves calendar, qualification totals, nesting and both unique champions", () => {
    const config = fixture(),
      result = simulateNba(config, {}, 100, 42);
    expect(config.games).toHaveLength(1200);
    expect(result.syntheticGames).toHaveLength(30);
    expect(result.gamesPerTeam).toBe(82);
    for (const [key, total] of Object.entries({
      champion: 1,
      final: 2,
      conferenceFinal: 4,
      round2: 8,
      playoffs: 16,
      cupQualify: 8,
      cupSemifinal: 4,
      cupFinal: 2,
      cupChampion: 1,
    }))
      expect(
        result.rows.reduce((n, r) => n + r[key as keyof typeof r], 0),
      ).toBeCloseTo(total, 9);
    for (const r of result.rows) {
      expect(r.champion).toBeLessThanOrEqual(r.final);
      expect(r.final).toBeLessThanOrEqual(r.playoffs);
      expect(r.cupChampion).toBeLessThanOrEqual(r.cupFinal);
      expect(r.cupFinal).toBeLessThanOrEqual(r.cupQualify);
    }
    expect(result.rows.reduce((n, r) => n + r.wins, 0)).toBeCloseTo(1230, 8);
    expect(
      result.cupBracket.filter((m) => m.stage === "Cup · Final"),
    ).toHaveLength(1);
    const repeated = simulateNba(config, {}, 100, 42);
    expect(repeated.rows).toEqual(result.rows);
    expect(repeated.playoffBracket).toEqual(result.playoffBracket);
  });
  it("does not mutate real fixtures and rejects forcing played games or unrelated winners", () => {
    const config = fixture(),
      game = config.games[0];
    const before = JSON.stringify(config.games);
    const r = simulateNba(config, { [game.id]: game.homeId }, 100, 42);
    expect(r.scenario[game.id]).toBe(game.homeId);
    expect(JSON.stringify(config.games)).toBe(before);
    expect(() => simulateNba(config, { [game.id]: 999 }, 100)).toThrow();
    game.status = "finished";
    game.homePts = 100;
    game.awayPts = 99;
    expect(() =>
      simulateNba(config, { [game.id]: game.awayId }, 100),
    ).toThrow();
  });
  it("fails closed on incomplete schedules and missing Cup groups", () => {
    const config = fixture();
    config.games.pop();
    expect(() => simulateNba(config, {}, 100)).toThrow(/calendario/);
    const missing = fixture();
    missing.cup = null;
    expect(() => simulateNba(missing, {}, 100)).toThrow(/configuración/);
  });
  it("computes seven-game series and restarts tie criteria after partial separation", () => {
    expect(
      seriesProbability(0, 1, [
        [0.5, 0.5],
        [0.5, 0.5],
      ]),
    ).toBeCloseTo(0.5);
    expect(
      seriesProbability(0, 1, [
        [0.5, 1],
        [0, 0.5],
      ]),
    ).toBe(1);
    const ranked = breakTie(
      [0, 1, 2],
      (group) =>
        group.length === 3
          ? [(t) => (t === 0 ? 2 : 1)]
          : [(t) => (t === 2 ? 1 : 0)],
      randomSeed(1),
    );
    expect(ranked).toEqual([0, 2, 1]);
  });
});
