import { describe, expect, it } from "vitest";
import {
  foldName,
  nbaSeasonParam,
  nbaValue,
  orderedNbaGames,
  nbaToday,
  nbaProbability,
  type NbaGame,
} from "./nba";
import { assignNbaSlot, EMPTY_NBA, parseNbaPersonal } from "./nba-personal";

describe("NBA display and browsing", () => {
  it("keeps the NBA calendar day across European midnight and avoids rounded certainty", () => {
    expect(nbaToday(new Date("2026-11-14T02:00:00Z"))).toBe("2026-11-13");
    expect(nbaProbability(1)).toBe(">99,9%");
    expect(nbaProbability(0.0001)).toBe("<0,1%");
  });
  it("does not convert missing values into zero and formats observed percentages", () => {
    expect(nbaValue({ pts: null }, "pts")).toBe("—");
    expect(nbaValue({ pts: 0 }, "pts")).toBe("0");
    expect(nbaValue({ ts_pct: 0.625 }, "ts_pct")).toBe("62,5%");
    expect(nbaValue({ net_rating: -4 }, "net_rating")).toBe("-4");
  });
  it("validates seasons without interpreting malformed strings", () => {
    expect(nbaSeasonParam("2026")).toBe(2026);
    expect(nbaSeasonParam("2026x")).toBeNull();
    expect(nbaSeasonParam("20000")).toBeNull();
    expect(foldName("Nikola Jokić")).toBe("nikola jokic");
  });
  it("shows nearest scheduled matches first and recent results separately", () => {
    const make = (id: string, date: string, status: string): NbaGame => ({
      id,
      date,
      status,
      homeId: 1,
      awayId: 2,
      homePts: null,
      awayPts: null,
    });
    const games = [
      make("3", "2026-12-01", "scheduled"),
      make("1", "2026-11-01", "finished"),
      make("2", "2026-11-15", "scheduled"),
    ];
    expect(
      orderedNbaGames(games, "upcoming", "2026-11-13").map((g) => g.id),
    ).toEqual(["2", "3"]);
    expect(
      orderedNbaGames(games, "season", "2026-11-13").map((g) => g.id),
    ).toEqual(["1", "2", "3"]);
  });
});
describe("NBA personal state is distinct from football", () => {
  it("recovers invalid storage and removes duplicate lineup entries", () => {
    expect(parseNbaPersonal("{")).toEqual(EMPTY_NBA);
    const state = parseNbaPersonal(
      JSON.stringify({
        version: 1,
        players: [1, 1, -1],
        teams: [2],
        five: [1, 1, 3],
      }),
    );
    expect(state.players).toEqual([1]);
    expect(state.five).toEqual([1, null, 3, null, null]);
  });
  it("accepts mixed positions, rejects duplicates and permits removing a player", () => {
    const player = {
      id: 1,
      name: "Example",
      position: "G-F",
      teamId: 2,
      metrics: {},
    };
    const state = assignNbaSlot(EMPTY_NBA, 0, player);
    expect(state.five[0]).toBe(1);
    expect(assignNbaSlot(state, 1, player)).toBe(state);
    expect(assignNbaSlot(EMPTY_NBA, 4, player)).toBe(EMPTY_NBA);
    expect(assignNbaSlot(state, 0, null).five[0]).toBeNull();
  });
});
