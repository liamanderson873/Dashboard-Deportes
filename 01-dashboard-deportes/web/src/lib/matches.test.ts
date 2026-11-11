import { describe, expect, test } from "vitest";
import {
  formatMatchDate,
  formatMatchTime,
  groupByDay,
  isPlayed,
  parseMatchday,
  statusLabel,
  type MatchRow,
  type TeamRef,
} from "@/lib/matches";
import { defaultMatchday } from "@/lib/queries/matches";

const team = (id: number): TeamRef => ({
  id,
  name: `Equipo ${id}`,
  shortName: `Eq${id}`,
  tla: null,
  crest: null,
});

function match(over: Partial<MatchRow> = {}): MatchRow {
  return {
    id: 1,
    matchday: 1,
    utcDate: new Date("2024-08-17T19:30:00Z"),
    status: "FINISHED",
    home: team(1),
    away: team(2),
    homeGoals: 2,
    awayGoals: 1,
    homeHtGoals: null,
    awayHtGoals: null,
    ...over,
  };
}

describe("matches", () => {
  test("test_is_played_needs_counted_status_and_goals", () => {
    expect(isPlayed(match())).toBe(true);
    expect(isPlayed(match({ status: "AWARDED" }))).toBe(true);
    expect(isPlayed(match({ status: "POSTPONED" }))).toBe(false);
    expect(isPlayed(match({ homeGoals: null }))).toBe(false);
    expect(isPlayed(match({ awayGoals: null }))).toBe(false);
  });

  test("test_status_label_in_spanish", () => {
    expect(statusLabel("SCHEDULED")).toBe("Programado");
    expect(statusLabel("TIMED")).toBe("Programado");
    expect(statusLabel("POSTPONED")).toBe("Aplazado");
    expect(statusLabel("CANCELLED")).toBe("Cancelado");
    expect(statusLabel("SUSPENDED")).toBe("Suspendido");
    expect(statusLabel("IN_PLAY")).toBe("En juego");
    expect(statusLabel("PAUSED")).toBe("En juego");
    expect(statusLabel("AWARDED")).toBe("Resuelto en los despachos");
    expect(statusLabel("FINISHED")).toBeNull();
    expect(statusLabel("WEIRD")).toBe("WEIRD");
  });

  test("test_format_match_date_and_time_use_madrid_time", () => {
    const d = new Date("2024-08-17T19:30:00Z");
    expect(formatMatchTime(d)).toBe("21:30");
    expect(formatMatchDate(d)).toBe("sáb, 17 ago 2024");
    const late = new Date("2024-08-17T22:30:00Z");
    expect(formatMatchTime(late)).toBe("00:30");
    expect(formatMatchDate(late)).toBe("dom, 18 ago 2024");
  });

  test("test_group_by_day_keeps_order_and_splits_by_madrid_day", () => {
    const a = match({ id: 1, utcDate: new Date("2024-08-17T19:30:00Z") });
    const b = match({ id: 2, utcDate: new Date("2024-08-17T22:30:00Z") });
    const c = match({ id: 3, utcDate: new Date("2024-08-18T10:00:00Z") });
    const groups = groupByDay([a, b, c]);
    expect(groups).toHaveLength(2);
    expect(groups[0].matches.map((m) => m.id)).toEqual([1]);
    expect(groups[1].matches.map((m) => m.id)).toEqual([2, 3]);
    expect(groups[0].day).toBe("sáb, 17 ago 2024");
    expect(groupByDay([])).toEqual([]);
  });

  test("test_parse_matchday_rejects_bad_input", () => {
    for (const bad of ["", "0", "abc", "1.5", "100", " 3", "-1", "007x"]) {
      expect(parseMatchday(bad)).toBeNull();
    }
    expect(parseMatchday("1")).toBe(1);
    expect(parseMatchday("38")).toBe(38);
    expect(parseMatchday("99")).toBe(99);
  });

  test("test_default_matchday", () => {
    expect(defaultMatchday([])).toBeNull();
    expect(
      defaultMatchday([
        { matchday: 1, played: 10 },
        { matchday: 2, played: 3 },
        { matchday: 3, played: 0 },
      ]),
    ).toBe(2);
    expect(
      defaultMatchday([
        { matchday: 1, played: 0 },
        { matchday: 2, played: 0 },
      ]),
    ).toBe(1);
  });
});
