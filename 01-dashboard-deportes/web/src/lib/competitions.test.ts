import { describe, expect, it } from "vitest";
import {
  COMPETITIONS,
  competitionBySlug,
  formatSeason,
  parseSeason,
} from "@/lib/competitions";

describe("competitions", () => {
  it("test_competitions_are_the_five_leagues_in_order", () => {
    expect(COMPETITIONS.map((c) => [c.code, c.slug, c.name, c.country])).toEqual([
      ["PD", "pd", "LaLiga", "España"],
      ["PL", "pl", "Premier League", "Inglaterra"],
      ["SA", "sa", "Serie A", "Italia"],
      ["BL1", "bl1", "Bundesliga", "Alemania"],
      ["FL1", "fl1", "Ligue 1", "Francia"],
    ]);
  });

  it("test_competition_by_slug_is_case_insensitive_and_unknown_is_undefined", () => {
    expect(competitionBySlug("pd")?.code).toBe("PD");
    expect(competitionBySlug("BL1")?.code).toBe("BL1");
    expect(competitionBySlug("Fl1")?.name).toBe("Ligue 1");
    expect(competitionBySlug("xx")).toBeUndefined();
    expect(competitionBySlug("")).toBeUndefined();
  });

  it("test_format_season", () => {
    expect(formatSeason(2026)).toBe("2026-27");
    expect(formatSeason(2024)).toBe("2024-25");
    expect(formatSeason(2099)).toBe("2099-00");
  });

  it("test_parse_season_accepts_four_digit_years_in_range", () => {
    expect(parseSeason("2026")).toBe(2026);
    for (const bad of ["abc", "1999", "20260", "26", "", "2026.5", " 2026"]) {
      expect(parseSeason(bad)).toBeNull();
    }
  });
});
