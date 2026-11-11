import { describe, expect, it } from "vitest";
import { sectionHref, teamHref } from "@/lib/sections";

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
});
