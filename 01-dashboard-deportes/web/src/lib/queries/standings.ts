import type { Sql } from "postgres";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import type { Result, StandingRow } from "@/lib/standings";

/** Match statuses that count towards the table. */
export const COUNTED_STATUSES = ["FINISHED", "AWARDED"] as const;

type TableRow = {
  team_id: number;
  team: string;
  short_name: string;
  tla: string | null;
  crest: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

type FormRow = { team_id: number; result: Result };

export async function getStandings(
  sql: Sql,
  competition: CompetitionCode,
  season: number,
): Promise<StandingRow[]> {
  const statuses = [...COUNTED_STATUSES];

  const table = await sql<TableRow[]>`
    WITH sides AS (
      SELECT home_team_id AS team_id, home_goals AS gf, away_goals AS ga
      FROM matches
      WHERE competition = ${competition} AND season = ${season}
        AND status = ANY(${statuses})
        AND home_goals IS NOT NULL AND away_goals IS NOT NULL
      UNION ALL
      SELECT away_team_id, away_goals, home_goals
      FROM matches
      WHERE competition = ${competition} AND season = ${season}
        AND status = ANY(${statuses})
        AND home_goals IS NOT NULL AND away_goals IS NOT NULL
    )
    SELECT
      t.id AS team_id,
      t.name AS team,
      COALESCE(t.short_name, t.name) AS short_name,
      t.tla,
      t.crest,
      COUNT(*)::int AS played,
      (COUNT(*) FILTER (WHERE s.gf > s.ga))::int AS won,
      (COUNT(*) FILTER (WHERE s.gf = s.ga))::int AS drawn,
      (COUNT(*) FILTER (WHERE s.gf < s.ga))::int AS lost,
      SUM(s.gf)::int AS goals_for,
      SUM(s.ga)::int AS goals_against,
      (SUM(s.gf) - SUM(s.ga))::int AS goal_difference,
      (3 * COUNT(*) FILTER (WHERE s.gf > s.ga)
         + COUNT(*) FILTER (WHERE s.gf = s.ga))::int AS points
    FROM sides s
    JOIN teams t ON t.id = s.team_id
    GROUP BY t.id, t.name, t.short_name, t.tla, t.crest
    ORDER BY points DESC, goal_difference DESC, goals_for DESC, t.name ASC`;

  if (table.length === 0) return [];

  const formRows = await sql<FormRow[]>`
    WITH sides AS (
      SELECT id, utc_date, home_team_id AS team_id, home_goals AS gf, away_goals AS ga
      FROM matches
      WHERE competition = ${competition} AND season = ${season}
        AND status = ANY(${statuses})
        AND home_goals IS NOT NULL AND away_goals IS NOT NULL
      UNION ALL
      SELECT id, utc_date, away_team_id, away_goals, home_goals
      FROM matches
      WHERE competition = ${competition} AND season = ${season}
        AND status = ANY(${statuses})
        AND home_goals IS NOT NULL AND away_goals IS NOT NULL
    ), ranked AS (
      SELECT team_id,
             CASE WHEN gf > ga THEN 'W' WHEN gf = ga THEN 'D' ELSE 'L' END AS result,
             row_number() OVER (
               PARTITION BY team_id ORDER BY utc_date DESC, id DESC
             ) AS rn,
             utc_date, id
      FROM sides
    )
    SELECT team_id, result
    FROM ranked
    WHERE rn <= 5
    ORDER BY team_id, utc_date ASC, id ASC`;

  const formByTeam = new Map<number, Result[]>();
  for (const f of formRows) {
    const list = formByTeam.get(f.team_id) ?? [];
    list.push(f.result);
    formByTeam.set(f.team_id, list);
  }

  return table.map((r, i) => ({
    position: i + 1,
    teamId: r.team_id,
    team: r.team,
    shortName: r.short_name,
    tla: r.tla,
    crest: r.crest,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goals_for,
    goalsAgainst: r.goals_against,
    goalDifference: r.goal_difference,
    points: r.points,
    form: formByTeam.get(r.team_id) ?? [],
  }));
}

/** Seasons that have matches for the competition, newest first. */
export async function getAvailableSeasons(
  sql: Sql,
  competition: CompetitionCode,
): Promise<number[]> {
  const rows = await sql<{ season: number }[]>`
    SELECT DISTINCT season FROM matches
    WHERE competition = ${competition}
    ORDER BY season DESC`;
  return rows.map((r) => r.season);
}

/** Latest LaLiga season if any; otherwise the first league with matches. */
export async function getDefaultView(
  sql: Sql,
): Promise<{ competition: CompetitionCode; season: number } | null> {
  const ordered = [
    ...COMPETITIONS.filter((c) => c.code === "PD"),
    ...COMPETITIONS.filter((c) => c.code !== "PD"),
  ];
  for (const c of ordered) {
    const [season] = await getAvailableSeasons(sql, c.code);
    if (season !== undefined) return { competition: c.code, season };
  }
  return null;
}
