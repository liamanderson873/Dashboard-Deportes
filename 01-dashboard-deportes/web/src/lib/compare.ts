import { es } from "@/lib/es";
import type { AdvancedStats } from "@/lib/queries/team";
import { formatDecimalEs } from "@/lib/route-params";
import type { StandingRow } from "@/lib/standings";
import { parseTeamId } from "@/lib/team";

export type CompareSelection = {
  a: number | null;
  b: number | null;
  error: "same" | "unknown" | null;
};

type Raw = string | string[] | undefined;

function first(raw: Raw): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Reads the `a` and `b` query values; ids outside `teamIds` or invalid never reach the queries. */
export function parseSelection(rawA: Raw, rawB: Raw, teamIds: number[]): CompareSelection {
  let error: CompareSelection["error"] = null;
  const side = (raw: Raw): number | null => {
    const text = first(raw);
    if (text === undefined || text === "") return null;
    const id = parseTeamId(text);
    if (id === null || !teamIds.includes(id)) {
      error = "unknown";
      return null;
    }
    return id;
  };
  const a = side(rawA);
  let b = side(rawB);
  if (a !== null && a === b) {
    b = null;
    error = "same";
  }
  return { a, b, error };
}

export type CompareRow = {
  label: string;
  a: string;
  b: string;
  better: "a" | "b" | null;
  /** Raw values, for the proportional bars; `null` when the metric is missing. */
  aValue?: number | null;
  bValue?: number | null;
};

type Side = { row: StandingRow; adv: AdvancedStats };
type Better = "higher" | "lower" | null;

function line(
  label: string,
  a: number | null,
  b: number | null,
  better: Better,
  format: (n: number) => string,
): CompareRow {
  const missing = es.team.unavailable;
  let winner: CompareRow["better"] = null;
  if (better !== null && a !== null && b !== null && a !== b) {
    winner = (better === "higher" ? a > b : a < b) ? "a" : "b";
  }
  return {
    label,
    a: a === null ? missing : format(a),
    b: b === null ? missing : format(b),
    better: winner,
    aValue: a,
    bValue: b,
  };
}

const int = (n: number) => String(n);

export function buildCompareRows(a: Side, b: Side): CompareRow[] {
  const r = es.compare.rows;
  const stand = (label: string, pick: (s: StandingRow) => number, better: Better) =>
    line(label, pick(a.row), pick(b.row), better, int);
  const adv = (label: string, pick: (s: AdvancedStats) => number | null, better: Better) =>
    line(label, pick(a.adv), pick(b.adv), better, formatDecimalEs);
  return [
    stand(r.position, (s) => s.position, "lower"),
    stand(r.points, (s) => s.points, "higher"),
    stand(r.played, (s) => s.played, null),
    stand(r.won, (s) => s.won, "higher"),
    stand(r.goalsFor, (s) => s.goalsFor, "higher"),
    stand(r.goalsAgainst, (s) => s.goalsAgainst, "lower"),
    stand(r.goalDifference, (s) => s.goalDifference, "higher"),
    adv(r.xgFor, (s) => s.xgFor, "higher"),
    adv(r.xgAgainst, (s) => s.xgAgainst, "lower"),
    adv(r.shots, (s) => s.shots, "higher"),
    adv(r.shotsOnTarget, (s) => s.shotsOnTarget, "higher"),
    adv(r.corners, (s) => s.corners, "higher"),
    adv(r.fouls, (s) => s.fouls, null),
    adv(r.yellow, (s) => s.yellow, "lower"),
  ];
}

/**
 * Bar lengths (0 to 100) for a duel row: each value over the larger of the two,
 * only when both are numbers >= 0. `null` means "draw no bars".
 */
export function duelBars(
  a: number | null | undefined,
  b: number | null | undefined,
): { a: number; b: number } | null {
  if (typeof a !== "number" || typeof b !== "number") return null;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null;
  const max = Math.max(a, b);
  if (max === 0) return { a: 0, b: 0 };
  return { a: (a / max) * 100, b: (b / max) * 100 };
}
