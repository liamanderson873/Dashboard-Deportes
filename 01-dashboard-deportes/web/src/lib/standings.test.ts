import { describe, expect, test } from "vitest";
import {
  formAriaLabel,
  summarize,
  zoneFor,
  type StandingRow,
} from "@/lib/standings";

function row(over: Partial<StandingRow>): StandingRow {
  return {
    position: 1,
    teamId: 1,
    team: "X",
    shortName: "X",
    tla: null,
    crest: null,
    played: 2,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
    ...over,
  };
}

describe("summarize", () => {
  test("test_summarize_picks_leader_best_attack_and_best_defense", () => {
    const a = row({ teamId: 1, team: "A", points: 6, goalsFor: 5, goalsAgainst: 1 });
    const b = row({ teamId: 2, team: "B", points: 1, goalsFor: 2, goalsAgainst: 3 });
    const c = row({ teamId: 3, team: "C", points: 1, goalsFor: 1, goalsAgainst: 4 });
    const s = summarize([a, b, c]);
    expect(s?.leader).toBe(a);
    expect(s?.bestAttack).toBe(a);
    expect(s?.bestAttack.goalsFor).toBe(5);
    expect(s?.bestDefense).toBe(a);
    expect(s?.bestDefense.goalsAgainst).toBe(1);
    expect(s?.matchesPlayed).toBe(3);
    expect(s?.goalsPerMatch).toBe(2.67);
  });

  test("test_summarize_of_no_rows_is_null", () => {
    expect(summarize([])).toBeNull();
  });

  test("ties go to the first row of the table", () => {
    const a = row({ teamId: 1, goalsFor: 3, goalsAgainst: 2 });
    const b = row({ teamId: 2, goalsFor: 3, goalsAgainst: 2 });
    const s = summarize([a, b]);
    expect(s?.bestAttack).toBe(a);
    expect(s?.bestDefense).toBe(a);
  });
});

describe("zoneFor", () => {
  test("test_zone_for_marks_top_four_and_bottom_three_only_in_big_tables", () => {
    expect(zoneFor(1, 20)).toBe("top");
    expect(zoneFor(4, 20)).toBe("top");
    expect(zoneFor(5, 20)).toBeNull();
    expect(zoneFor(17, 20)).toBeNull();
    expect(zoneFor(18, 20)).toBe("bottom");
    expect(zoneFor(20, 20)).toBe("bottom");
    for (let p = 1; p <= 8; p++) expect(zoneFor(p, 8)).toBeNull();
  });
});

describe("formAriaLabel", () => {
  test("test_form_aria_label_in_spanish", () => {
    expect(formAriaLabel(["W", "D", "L"])).toBe(
      "Últimos 3 partidos: victoria, empate, derrota",
    );
    expect(formAriaLabel(["W", "D", "L", "W", "W"])).toBe(
      "Últimos 5 partidos: victoria, empate, derrota, victoria, victoria",
    );
    expect(formAriaLabel(["W"])).toBe("Último partido: victoria");
    expect(formAriaLabel([])).toBe("Sin partidos jugados");
  });
});
