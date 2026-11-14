import type { Sql } from "postgres";
import type {
  NbaData,
  NbaMetrics,
  NbaGameLine,
  NbaShot,
  NbaModel,
} from "@/lib/nba";

const metrics = (raw: Record<string, unknown>): NbaMetrics =>
  Object.fromEntries(
    Object.entries(raw).filter(
      ([, v]) => (typeof v === "number" && Number.isFinite(v)) || v === null,
    ),
  ) as NbaMetrics;
const date = (v: unknown) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
export async function nbaSeasons(sql: Sql): Promise<number[]> {
  const [schema] = await sql`SELECT to_regclass('public.nba_games') AS present`;
  if (!schema?.present) return [];
  const rows =
    await sql`SELECT DISTINCT season FROM nba_games ORDER BY season DESC`;
  return rows.map((r) => Number(r.season));
}
export async function getNbaData(sql: Sql, season: number): Promise<NbaData> {
  const seasons = await nbaSeasons(sql);
  const empty: NbaData = {
    season,
    seasons,
    teams: [],
    players: [],
    games: [],
    models: {},
    sources: [],
    shotCount: 0,
    playerGameCount: 0,
  };
  if (!seasons.includes(season)) return empty;
  const [teams, players, games, models, sources, counts] = await Promise.all([
    sql`SELECT t.*,s.metrics FROM nba_teams t JOIN nba_team_stats s ON s.team_id=t.id WHERE s.season=${season} ORDER BY t.name`,
    sql`SELECT * FROM nba_players WHERE season=${season} ORDER BY name`,
    sql`SELECT * FROM nba_games WHERE season=${season} ORDER BY game_date,id`,
    sql`SELECT kind,metadata,predictions FROM nba_models WHERE season=${season} AND kind<>'laboratory'`,
    sql`SELECT dataset,metadata FROM nba_sources WHERE season=${season}`,
    sql`SELECT count(*) AS n,(SELECT count(DISTINCT game_id) FROM nba_player_games WHERE season=${season}) AS individual_games FROM nba_shots WHERE season=${season}`,
  ]);
  return {
    season,
    seasons,
    teams: teams.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      abbreviation: String(r.abbreviation),
      conference: String(r.conference),
      metrics: metrics(r.metrics),
    })),
    players: players.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      teamId: Number(r.team_id),
      position: r.position == null ? null : String(r.position),
      metrics: metrics(r.metrics),
    })),
    games: games.map((r) => ({
      id: String(r.id),
      date: date(r.game_date),
      homeId: Number(r.home_id),
      awayId: Number(r.away_id),
      homePts: r.home_pts == null ? null : Number(r.home_pts),
      awayPts: r.away_pts == null ? null : Number(r.away_pts),
      status: String(r.status),
    })),
    models: Object.fromEntries(
      models.map((r) => [
        r.kind,
        {
          kind: r.kind,
          metadata: r.metadata,
          predictions: r.predictions,
        } as NbaModel,
      ]),
    ),
    sources: sources.map((r) => ({
      dataset: String(r.dataset),
      rows: Number(r.metadata.rows),
      fetched: String(r.metadata.fetched),
      metadata: r.metadata,
    })),
    shotCount: Number(counts[0].n),
    playerGameCount: Number(counts[0].individual_games),
  };
}
export async function getNbaGameLines(
  sql: Sql,
  season: number,
  type: "player" | "game" | "team",
  id: string,
): Promise<NbaGameLine[]> {
  const rows =
    await sql`SELECT * FROM nba_player_games WHERE season=${season} AND
    ((${type}='player' AND player_id::text=${id}) OR (${type}='game' AND game_id=${id}) OR (${type}='team' AND team_id::text=${id})) ORDER BY game_date DESC,game_id,player_id`;
  return rows.map((r) => ({
    gameId: String(r.game_id),
    playerId: Number(r.player_id),
    teamId: Number(r.team_id),
    date: date(r.game_date),
    metrics: metrics(r.metrics),
  }));
}
export async function getNbaShots(
  sql: Sql,
  season: number,
  type: "player" | "game" | "team",
  id: string,
): Promise<{ shots: NbaShot[]; total: number }> {
  const rows =
    await sql`SELECT *,count(*) OVER() AS total FROM nba_shots WHERE season=${season} AND
    ((${type}='player' AND player_id::text=${id}) OR (${type}='game' AND game_id=${id}) OR (${type}='team' AND team_id::text=${id})) ORDER BY id DESC LIMIT 3000`;
  return {
    total: Number(rows[0]?.total ?? 0),
    shots: rows.map((r) => ({
      id: Number(r.id),
      gameId: String(r.game_id),
      playerId: Number(r.player_id),
      teamId: Number(r.team_id),
      x: Number(r.x),
      y: Number(r.y),
      distance: Number(r.distance),
      period: Number(r.period),
      seconds: Number(r.seconds),
      value: Number(r.value),
      made: Number(r.made),
      probability: r.probability == null ? null : Number(r.probability),
    })),
  };
}

export async function getNbaTeamTrendLines(
  sql: Sql,
  season: number,
  id: number,
): Promise<import("@/lib/nba-trends").TrendLine[]> {
  const rows =
    await sql`SELECT t.game_id,t.game_date,t.metrics,o.metrics AS opponent FROM nba_team_games t
 JOIN nba_team_games o ON o.season=t.season AND o.game_id=t.game_id AND o.team_id<>t.team_id
 WHERE t.season=${season} AND t.team_id=${id} ORDER BY t.game_date DESC,t.game_id DESC`;
  return rows.map((r) => ({
    gameId: String(r.game_id),
    date: date(r.game_date),
    metrics: metrics(r.metrics),
    opponent: metrics(r.opponent),
  }));
}
