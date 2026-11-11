export type Result = "W" | "D" | "L";

export type StandingRow = {
  position: number;
  teamId: number;
  team: string;
  shortName: string;
  tla: string | null;
  crest: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Last 5 results, oldest first. */
  form: Result[];
};

export type StandingsSummary = {
  leader: StandingRow;
  bestAttack: StandingRow;
  bestDefense: StandingRow;
  goalsPerMatch: number;
  matchesPlayed: number;
};

/** Headline numbers of a table; ties go to the first row of the table. */
export function summarize(rows: StandingRow[]): StandingsSummary | null {
  if (rows.length === 0) return null;
  const leader = rows[0];
  let bestAttack = leader;
  let bestDefense = leader;
  let totalGoals = 0;
  let totalPlayed = 0;
  for (const r of rows) {
    if (r.goalsFor > bestAttack.goalsFor) bestAttack = r;
    if (r.goalsAgainst < bestDefense.goalsAgainst) bestDefense = r;
    totalGoals += r.goalsFor;
    totalPlayed += r.played;
  }
  const matchesPlayed = totalPlayed / 2;
  const goalsPerMatch =
    matchesPlayed === 0 ? 0 : Math.round((totalGoals / matchesPlayed) * 100) / 100;
  return { leader, bestAttack, bestDefense, goalsPerMatch, matchesPlayed };
}

export type Zone = "top" | "bottom" | null;

/** Top 4 and bottom 3, only in tables of 10 or more teams. */
export function zoneFor(position: number, total: number): Zone {
  if (total < 10) return null;
  if (position >= 1 && position <= 4) return "top";
  if (position > total - 3 && position <= total) return "bottom";
  return null;
}

const RESULT_LABEL: Record<Result, string> = {
  W: "victoria",
  D: "empate",
  L: "derrota",
};

export function formAriaLabel(form: Result[]): string {
  if (form.length === 0) return "Sin partidos jugados";
  return `Últimos 5 partidos: ${form.map((r) => RESULT_LABEL[r]).join(", ")}`;
}
