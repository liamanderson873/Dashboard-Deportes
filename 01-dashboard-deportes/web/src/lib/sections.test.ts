import { describe, expect, it } from "vitest";
import { primarySection, sectionHref, teamHref } from "@/lib/sections";

describe("sections", () => {
  it("test_section_href_for_each_section", () => {
    expect(sectionHref("pd", 2024, "clasificacion")).toBe("/pd/2024");
    expect(sectionHref("pd", 2024, "resultados")).toBe("/pd/2024/resultados");
    expect(sectionHref("pl", 2023, "goleadores")).toBe("/pl/2023/goleadores");
    expect(sectionHref("sa", 2022, "comparar")).toBe("/sa/2022/comparar");
  });

  it("test_team_href", () => {
    expect(teamHref("pd", 2024, 81)).toBe("/pd/2024/equipo/81");
  });

  it("keeps tools independent and groups match details with matches", () => {
    for (const section of ['partidos', 'seguimiento', 'mi-once', 'jugadores'] as const) {
      expect(sectionHref('pd', 2026, section)).toBe(`/pd/2026/${section}`);
      expect(primarySection(section)).toBe(section);
    }
    expect(primarySection('resultados')).toBe('partidos');
    expect(primarySection('comparar')).toBe('liga');
    expect(primarySection(null)).toBe('liga');
  });
});
