import { describe, expect, it } from "vitest";
import { competitionBySlug } from "@/lib/competitions";
import { formatDecimalEs, resolveRoute, targetSeason } from "@/lib/route-params";

describe("resolveRoute", () => {
  it("test_resolve_route_accepts_valid_pairs", () => {
    expect(resolveRoute("pd", "2026")).toEqual({
      competition: competitionBySlug("pd"),
      season: 2026,
    });
    expect(resolveRoute("BL1", "2024")?.competition.code).toBe("BL1");
  });

  it("test_resolve_route_rejects_unknown_slug_and_bad_seasons", () => {
    expect(resolveRoute("xx", "2026")).toBeNull();
    expect(resolveRoute("pd", "abc")).toBeNull();
    expect(resolveRoute("pd", "1999")).toBeNull();
    expect(resolveRoute("pd", "")).toBeNull();
    expect(resolveRoute("", "2026")).toBeNull();
  });
});

describe("formatDecimalEs", () => {
  it("test_format_decimal_es_uses_comma", () => {
    expect(formatDecimalEs(2.67)).toBe("2,67");
    expect(formatDecimalEs(3)).toBe("3,00");
    expect(formatDecimalEs(0)).toBe("0,00");
  });
});

describe("targetSeason", () => {
  it("test_target_season_prefers_current_then_latest_then_null", () => {
    expect(targetSeason([2025, 2024], 2024)).toBe(2024);
    expect(targetSeason([2023, 2022], 2024)).toBe(2023);
    expect(targetSeason([], 2024)).toBeNull();
    expect(targetSeason(undefined, 2024)).toBeNull();
  });
});
