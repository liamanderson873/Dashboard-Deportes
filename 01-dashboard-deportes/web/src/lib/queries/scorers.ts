import type { Sql } from "postgres";
import type { CompetitionCode } from "@/lib/competitions";
import type { TeamRef } from "@/lib/matches";

export type ScorerRow = {
  rank: number;
  playerId: number;
  player: string;
  position: string | null;
  nationality: string | null;
  team: TeamRef | null;
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number | null;
};

type Row = {
  rank: number;
  player_id: number;
  player: string;
  position: string | null;
  nationality: string | null;
  team_id: number | null;
  team_name: string | null;
  team_short: string | null;
  team_tla: string | null;
  team_crest: string | null;
  goals: number;
  assists: number | null;
  penalties: number | null;
  played_matches: number | null;
};

/** Top scorers of a season; equal goals share the rank (1, 1, 3). */
export async function getScorers(
  sql: Sql,
  competition: CompetitionCode,
  season: number,
  limit = 50,
): Promise<ScorerRow[]> {
  const rows = await sql<Row[]>`
    SELECT
      (RANK() OVER (ORDER BY s.goals DESC))::int AS rank,
      p.id AS player_id,
      p.name AS player,
      p.position,
      p.nationality,
      t.id AS team_id,
      t.name AS team_name,
      COALESCE(t.short_name, t.name) AS team_short,
      t.tla AS team_tla,
      t.crest AS team_crest,
      s.goals::int AS goals,
      s.assists::int AS assists,
      s.penalties::int AS penalties,
      s.played_matches::int AS played_matches
    FROM scorers s
    JOIN players p ON p.id = s.player_id
    LEFT JOIN teams t ON t.id = s.team_id
    WHERE s.competition = ${competition} AND s.season = ${season}
      AND s.goals IS NOT NULL
    ORDER BY s.goals DESC, s.assists DESC NULLS LAST, p.name ASC, p.id ASC
    LIMIT ${limit}`;
  return rows.map((r) => ({
    rank: r.rank,
    playerId: r.player_id,
    player: r.player,
    position: r.position,
    nationality: r.nationality,
    team:
      r.team_id === null
        ? null
        : {
            id: r.team_id,
            name: r.team_name ?? "",
            shortName: r.team_short ?? r.team_name ?? "",
            tla: r.team_tla,
            crest: r.team_crest,
          },
    goals: r.goals,
    assists: r.assists,
    penalties: r.penalties,
    playedMatches: r.played_matches,
  }));
}
