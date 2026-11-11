import type { Sql } from "postgres";
import type { CompetitionCode } from "@/lib/competitions";
import type { MatchRow } from "@/lib/matches";
import { toMatchRow, type MatchSqlRow } from "@/lib/queries/matches";

/** Every match between both teams in the competition, all seasons, newest first. */
export async function getHeadToHead(
  sql: Sql,
  competition: CompetitionCode,
  teamA: number,
  teamB: number,
): Promise<MatchRow[]> {
  const rows = await sql<MatchSqlRow[]>`
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
    WHERE m.competition = ${competition}
      AND ((m.home_team_id = ${teamA} AND m.away_team_id = ${teamB})
        OR (m.home_team_id = ${teamB} AND m.away_team_id = ${teamA}))
    ORDER BY m.utc_date DESC, m.id DESC`;
  return rows.map(toMatchRow);
}
