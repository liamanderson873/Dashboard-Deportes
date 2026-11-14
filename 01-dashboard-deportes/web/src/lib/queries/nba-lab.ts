import type { Sql } from "postgres";
import type { Explanation, SimConfig } from "@/lib/nba-simulator";
export type ForecastRecord = {
  gameId: string;
  date: string;
  homeId: number;
  awayId: number;
  homePts: number | null;
  awayPts: number | null;
  status: string;
  probability: number;
  created: string;
  cutoff: string;
  modelVersion: string;
};
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
export async function getSimulationConfig(
  sql: Sql,
  season: number,
): Promise<SimConfig | null> {
  const [schema] =
    await sql`SELECT to_regclass('public.nba_models') AS present`;
  if (!schema?.present) return null;
  const [row] =
    await sql`SELECT metadata FROM nba_models WHERE season=${season} AND kind='laboratory'`;
  return (row?.metadata as SimConfig) ?? null;
}
export async function getPredictionHistory(
  sql: Sql,
  season: number,
): Promise<ForecastRecord[]> {
  const [schema] =
    await sql`SELECT to_regclass('public.nba_prediction_history') AS present`;
  if (!schema?.present) return [];
  const rows =
    await sql`SELECT DISTINCT ON (h.game_id) h.game_id,h.model_version,h.created_at,h.data_cutoff,h.home_win,
 g.game_date,g.home_id,g.away_id,g.home_pts,g.away_pts,g.status FROM nba_prediction_history h JOIN nba_games g ON g.season=h.season AND g.id=h.game_id
 WHERE h.season=${season} AND h.forecast_day<g.game_date AND h.data_cutoff<g.game_date
 AND (h.created_at AT TIME ZONE 'America/New_York')::date<g.game_date
 ORDER BY h.game_id,h.created_at DESC,h.model_version LIMIT 1500`;
  return rows
    .map((r) => ({
      gameId: String(r.game_id),
      date: iso(r.game_date).slice(0, 10),
      homeId: Number(r.home_id),
      awayId: Number(r.away_id),
      homePts: r.home_pts === null ? null : Number(r.home_pts),
      awayPts: r.away_pts === null ? null : Number(r.away_pts),
      status: String(r.status),
      probability: Number(r.home_win),
      created: iso(r.created_at),
      cutoff: iso(r.data_cutoff).slice(0, 10),
      modelVersion: String(r.model_version),
    }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
    );
}
export async function getPredictionExplanation(
  sql: Sql,
  season: number,
  gameId: string,
): Promise<{
  explanation: Explanation;
  cutoff: string;
  version: string;
  historical?: boolean;
} | null> {
  const [schema] =
    await sql`SELECT to_regclass('public.nba_models') AS present`;
  if (!schema?.present) return null;
  const [ledger] =
    await sql`SELECT to_regclass('public.nba_prediction_history') AS present`;
  if (ledger?.present) {
    const [past] =
      await sql`SELECT h.explanation,h.data_cutoff,h.model_version FROM nba_prediction_history h JOIN nba_games g ON g.season=h.season AND g.id=h.game_id
 WHERE h.season=${season} AND h.game_id=${gameId} AND g.status='finished' AND h.forecast_day<g.game_date AND h.data_cutoff<g.game_date AND (h.created_at AT TIME ZONE 'America/New_York')::date<g.game_date ORDER BY h.created_at DESC,h.model_version LIMIT 1`;
    if (past)
      return {
        explanation: past.explanation as Explanation,
        cutoff: iso(past.data_cutoff).slice(0, 10),
        version: String(past.model_version),
        historical: true,
      };
  }
  const [row] =
    await sql`SELECT g->'explanation' AS explanation,m.metadata->>'cutoff' AS cutoff,m.metadata->>'modelVersion' AS version
 FROM nba_models m CROSS JOIN LATERAL jsonb_array_elements(m.metadata->'games') g
 WHERE m.season=${season} AND m.kind='laboratory' AND g->>'id'=${gameId} AND g->'explanation' IS NOT NULL LIMIT 1`;
  return row
    ? {
        explanation: row.explanation as Explanation,
        cutoff: String(row.cutoff),
        version: String(row.version),
      }
    : null;
}
