import type { Sql } from "postgres";
import type { CompetitionCode } from "@/lib/competitions";
import type { MatchRow } from "@/lib/matches";
import { COUNTED_STATUSES } from "@/lib/queries/standings";

export type MatchdaySummary = { matchday: number; total: number; played: number };

export async function getMatchdays(
  sql: Sql,
  competition: CompetitionCode,
  season: number,
): Promise<MatchdaySummary[]> {
  const statuses = [...COUNTED_STATUSES];
  return sql<MatchdaySummary[]>`
    SELECT
      matchday::int AS matchday,
      COUNT(*)::int AS total,
      (COUNT(*) FILTER (
        WHERE status = ANY(${statuses})
          AND home_goals IS NOT NULL AND away_goals IS NOT NULL
      ))::int AS played
    FROM matches
    WHERE competition = ${competition} AND season = ${season}
      AND matchday IS NOT NULL
    GROUP BY matchday
    ORDER BY matchday`;
}

type Row = {
  id: number;
  matchday: number | null;
  utc_date: Date;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  home_ht_goals: number | null;
  away_ht_goals: number | null;
  home_id: number;
  home_name: string;
  home_short: string;
  home_tla: string | null;
  home_crest: string | null;
  away_id: number;
  away_name: string;
  away_short: string;
  away_tla: string | null;
  away_crest: string | null;
};

export async function getMatchesByMatchday(
  sql: Sql,
  competition: CompetitionCode,
  season: number,
  matchday: number,
): Promise<MatchRow[]> {
  const rows = await sql<Row[]>`
    SELECT
      m.id::int AS id,
      m.matchday::int AS matchday,
      m.utc_date,
      m.status,
      m.home_goals::int AS home_goals,
      m.away_goals::int AS away_goals,
      m.home_ht_goals::int AS home_ht_goals,
      m.away_ht_goals::int AS away_ht_goals,
      h.id::int AS home_id,
      h.name AS home_name,
      COALESCE(h.short_name, h.name) AS home_short,
      h.tla AS home_tla,
      h.crest AS home_crest,
      a.id::int AS away_id,
      a.name AS away_name,
      COALESCE(a.short_name, a.name) AS away_short,
      a.tla AS away_tla,
      a.crest AS away_crest
    FROM matches m
    JOIN teams h ON h.id = m.home_team_id
    JOIN teams a ON a.id = m.away_team_id
    WHERE m.competition = ${competition} AND m.season = ${season}
      AND m.matchday = ${matchday}
    ORDER BY m.utc_date, m.id`;
  return rows.map((r) => ({
    id: r.id,
    matchday: r.matchday,
    utcDate: r.utc_date,
    status: r.status,
    homeGoals: r.home_goals,
    awayGoals: r.away_goals,
    homeHtGoals: r.home_ht_goals,
    awayHtGoals: r.away_ht_goals,
    home: {
      id: r.home_id,
      name: r.home_name,
      shortName: r.home_short,
      tla: r.home_tla,
      crest: r.home_crest,
    },
    away: {
      id: r.away_id,
      name: r.away_name,
      shortName: r.away_short,
      tla: r.away_tla,
      crest: r.away_crest,
    },
  }));
}

/** Latest matchday with a played match; else the first; null without matchdays. */
export function defaultMatchday(
  days: { matchday: number; played: number }[],
): number | null {
  if (days.length === 0) return null;
  const withPlayed = days.filter((d) => d.played > 0);
  return withPlayed.length > 0
    ? Math.max(...withPlayed.map((d) => d.matchday))
    : Math.min(...days.map((d) => d.matchday));
}
