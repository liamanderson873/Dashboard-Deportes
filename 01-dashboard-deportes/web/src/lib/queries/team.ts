import type { Sql } from "postgres";
import type { CompetitionCode } from "@/lib/competitions";
import type { MatchRow } from "@/lib/matches";
import { toMatchRow, type MatchSqlRow } from "@/lib/queries/matches";
import { COUNTED_STATUSES } from "@/lib/queries/standings";

export type TeamProfile = {
  id: number;
  name: string;
  shortName: string;
  tla: string | null;
  crest: string | null;
  founded: number | null;
  venue: string | null;
  clubColors: string | null;
  website: string | null;
  coach: string | null;
};

type ProfileRow = {
  id: number;
  name: string;
  short_name: string;
  tla: string | null;
  crest: string | null;
  founded: number | null;
  venue: string | null;
  club_colors: string | null;
  website: string | null;
  coach: string | null;
};

export async function getTeamProfile(
  sql: Sql,
  teamId: number,
): Promise<TeamProfile | null> {
  const [r] = await sql<ProfileRow[]>`
    SELECT
      id::int AS id,
      name,
      COALESCE(short_name, name) AS short_name,
      tla,
      crest,
      founded::int AS founded,
      venue,
      club_colors,
      website,
      coach
    FROM teams
    WHERE id = ${teamId}`;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    shortName: r.short_name,
    tla: r.tla,
    crest: r.crest,
    founded: r.founded,
    venue: r.venue,
    clubColors: r.club_colors,
    website: r.website,
    coach: r.coach,
  };
}

/** Seasons in which the team has matches in the competition, newest first. */
export async function getTeamSeasons(
  sql: Sql,
  competition: CompetitionCode,
  teamId: number,
): Promise<number[]> {
  const rows = await sql<{ season: number }[]>`
    SELECT DISTINCT season::int AS season
    FROM matches
    WHERE competition = ${competition}
      AND (home_team_id = ${teamId} OR away_team_id = ${teamId})
    ORDER BY season DESC`;
  return rows.map((r) => r.season);
}

/** Every match of the team in the season (any status), by date. */
export async function getTeamMatches(
  sql: Sql,
  competition: CompetitionCode,
  season: number,
  teamId: number,
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
    WHERE m.competition = ${competition} AND m.season = ${season}
      AND (m.home_team_id = ${teamId} OR m.away_team_id = ${teamId})
    ORDER BY m.utc_date, m.id`;
  return rows.map(toMatchRow);
}

export type SquadPlayer = {
  id: number;
  name: string;
  position: string | null;
  nationality: string | null;
  dateOfBirth: Date | null;
};

type SquadRow = {
  id: number;
  name: string;
  position: string | null;
  nationality: string | null;
  date_of_birth: Date | null;
};

/** Squad of the season, from `squad_members` (never `players.team_id`), by name. */
export async function getSquad(
  sql: Sql,
  season: number,
  teamId: number,
): Promise<SquadPlayer[]> {
  const rows = await sql<SquadRow[]>`
    SELECT p.id::int AS id, p.name, p.position, p.nationality, p.date_of_birth
    FROM squad_members sm
    JOIN players p ON p.id = sm.player_id
    WHERE sm.season = ${season} AND sm.team_id = ${teamId}
    ORDER BY p.name, p.id`;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position,
    nationality: r.nationality,
    dateOfBirth: r.date_of_birth,
  }));
}

export type AdvancedStats = {
  matchesWithStats: number;
  matchesWithXg: number;
  xgFor: number | null;
  xgAgainst: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  fouls: number | null;
  yellow: number | null;
  red: number | null;
};

type StatsRow = {
  matches_with_stats: number;
  matches_with_xg: number;
  xg_for: number | null;
  xg_against: number | null;
  shots: number | null;
  shots_on_target: number | null;
  corners: number | null;
  fouls: number | null;
  yellow: number | null;
  red: number | null;
};

const round2 = (n: number | null): number | null =>
  n === null ? null : Math.round(n * 100) / 100;

/** Per-match averages over played matches; each one only over matches with that value. */
export async function getAdvancedStats(
  sql: Sql,
  competition: CompetitionCode,
  season: number,
  teamId: number,
): Promise<AdvancedStats> {
  const statuses = [...COUNTED_STATUSES];
  const [r] = await sql<StatsRow[]>`
    WITH side AS (
      SELECT
        (m.home_team_id = ${teamId}) AS is_home,
        s.*
      FROM matches m
      JOIN match_stats s ON s.match_id = m.id
      WHERE m.competition = ${competition} AND m.season = ${season}
        AND (m.home_team_id = ${teamId} OR m.away_team_id = ${teamId})
        AND m.status = ANY(${statuses})
        AND m.home_goals IS NOT NULL AND m.away_goals IS NOT NULL
    )
    SELECT
      COUNT(*)::int AS matches_with_stats,
      (COUNT(*) FILTER (
        WHERE (CASE WHEN is_home THEN home_xg ELSE away_xg END) IS NOT NULL
      ))::int AS matches_with_xg,
      AVG(CASE WHEN is_home THEN home_xg ELSE away_xg END)::float8 AS xg_for,
      AVG(CASE WHEN is_home THEN away_xg ELSE home_xg END)::float8 AS xg_against,
      AVG(CASE WHEN is_home THEN home_shots ELSE away_shots END)::float8 AS shots,
      AVG(CASE WHEN is_home THEN home_shots_on_target ELSE away_shots_on_target END)::float8
        AS shots_on_target,
      AVG(CASE WHEN is_home THEN home_corners ELSE away_corners END)::float8 AS corners,
      AVG(CASE WHEN is_home THEN home_fouls ELSE away_fouls END)::float8 AS fouls,
      AVG(CASE WHEN is_home THEN home_yellow ELSE away_yellow END)::float8 AS yellow,
      AVG(CASE WHEN is_home THEN home_red ELSE away_red END)::float8 AS red
    FROM side`;
  return {
    matchesWithStats: r?.matches_with_stats ?? 0,
    matchesWithXg: r?.matches_with_xg ?? 0,
    xgFor: round2(r?.xg_for ?? null),
    xgAgainst: round2(r?.xg_against ?? null),
    shots: round2(r?.shots ?? null),
    shotsOnTarget: round2(r?.shots_on_target ?? null),
    corners: round2(r?.corners ?? null),
    fouls: round2(r?.fouls ?? null),
    yellow: round2(r?.yellow ?? null),
    red: round2(r?.red ?? null),
  };
}
