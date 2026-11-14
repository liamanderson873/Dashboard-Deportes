import { describe, expect, it } from "vitest";
import { navigationContext, navigationDestinations } from "./navigation";

describe("navigation context", () => {
  it("keeps the sport, competition and season on deep pages", () => {
    expect(navigationContext("/nba/2025/jugador/201939", true)).toBe(
      "/nba/2025",
    );
    expect(navigationContext("/pl/2024/equipo/57", false)).toBe("/pl/2024");
    expect(navigationContext("/acerca", false)).toBe("/pd/2026");
  });
  it("makes secondary tools reachable without leaving the current season", () => {
    const nba = navigationDestinations("/nba/2025", true);
    expect(nba.find((item) => item.label === "Mapa de jugadores")?.href).toBe(
      "/nba/2025/jugadores?tab=chart",
    );
    const football = navigationDestinations("/pl/2024", false);
    expect(
      football.find((item) => item.label === "Comparar jugadores")?.href,
    ).toBe("/pl/2024/jugadores?tab=comparar");
    expect(new Set(football.map((item) => item.href)).size).toBe(
      football.length,
    );
  });
});
