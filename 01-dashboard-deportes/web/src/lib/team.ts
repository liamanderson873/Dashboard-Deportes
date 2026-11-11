import { isPlayed, type MatchRow, type TeamRef } from "@/lib/matches";
import type { Result } from "@/lib/standings";

export type TeamMatch = {
  match: MatchRow;
  isHome: boolean;
  opponent: TeamRef;
  goalsFor: number | null;
  goalsAgainst: number | null;
  result: Result | null;
};

function resultOf(gf: number, ga: number): Result {
  if (gf > ga) return "W";
  return gf === ga ? "D" : "L";
}

export function toTeamMatches(matches: MatchRow[], teamId: number): TeamMatch[] {
  return matches.map((match) => {
    const isHome = match.home.id === teamId;
    const goalsFor = isHome ? match.homeGoals : match.awayGoals;
    const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;
    const played = isPlayed(match) && goalsFor !== null && goalsAgainst !== null;
    return {
      match,
      isHome,
      opponent: isHome ? match.away : match.home,
      goalsFor,
      goalsAgainst,
      result: played ? resultOf(goalsFor, goalsAgainst) : null,
    };
  });
}

const POINTS: Record<Result, number> = { W: 3, D: 1, L: 0 };

export type ProgressPoint = { matchday: number; points: number; cumulative: number };

/** Cumulative points over the played matches, in date order. */
export function pointsProgression(tm: TeamMatch[]): ProgressPoint[] {
  const played = tm.filter((t) => t.result !== null);
  let cumulative = 0;
  return played.map((t, i) => {
    const points = POINTS[t.result as Result];
    cumulative += points;
    return { matchday: t.match.matchday ?? i + 1, points, cumulative };
  });
}

export type PositionGroup =
  | "goalkeepers"
  | "defenders"
  | "midfielders"
  | "forwards"
  | "unknown";

export function positionGroup(position: string | null): PositionGroup {
  if (position === null) return "unknown";
  if (position === "Goalkeeper") return "goalkeepers";
  if (position === "Defence" || position.includes("Back")) return "defenders";
  if (position.includes("Midfield")) return "midfielders";
  if (
    position === "Offence" ||
    position.includes("Forward") ||
    position.includes("Winger")
  ) {
    return "forwards";
  }
  return "unknown";
}

/** Full years on `on`; uses UTC date parts so a DATE value never shifts a day. */
export function ageOn(birth: Date | null, on: Date): number | null {
  if (birth === null) return null;
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export type SplitRecord = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export function splitRecord(
  tm: TeamMatch[],
  where: "all" | "home" | "away",
): SplitRecord {
  const rec: SplitRecord = {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
  for (const t of tm) {
    if (t.result === null || t.goalsFor === null || t.goalsAgainst === null) continue;
    if (where === "home" && !t.isHome) continue;
    if (where === "away" && t.isHome) continue;
    rec.played += 1;
    rec.goalsFor += t.goalsFor;
    rec.goalsAgainst += t.goalsAgainst;
    rec.points += POINTS[t.result];
    if (t.result === "W") rec.won += 1;
    else if (t.result === "D") rec.drawn += 1;
    else rec.lost += 1;
  }
  return rec;
}

export function parseTeamId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}
