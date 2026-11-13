export type NbaMetrics = Record<string, number | null>;
export type NbaTeam = {
  id: number;
  name: string;
  abbreviation: string;
  conference: string;
  metrics: NbaMetrics;
};
export type NbaPlayer = {
  id: number;
  name: string;
  teamId: number;
  position: string | null;
  metrics: NbaMetrics;
};
export type NbaGame = {
  id: string;
  date: string;
  homeId: number;
  awayId: number;
  homePts: number | null;
  awayPts: number | null;
  status: string;
};
export type Evaluation = {
  n: number;
  log_loss: number;
  brier: number;
  auc: number | null;
  calibration: { n: number; predicted: number; observed: number }[];
};
export type Forecast = {
  team_id: number;
  wins_mean: number;
  wins_p05: number;
  wins_p95: number;
  scheduled_games: number;
  direct: number;
  playin: number;
  playoffs: number;
  round2: number;
  conference_final: number;
  final: number;
  champion: number;
  champion_mc_se: number;
};
export type NbaModel = {
  kind: string;
  metadata: Record<string, unknown> & {
    test?: Evaluation;
    validation?: Evaluation;
    home_or_make_rate?: Evaluation;
    elo_baseline?: Evaluation;
    logistic_baseline?: Evaluation;
    value_baseline?: Evaluation;
    features?: string[];
    test_season?: number;
    validation_season?: number;
    production_refit_seasons?: number[];
  };
  predictions: unknown[];
};
export type NbaData = {
  season: number;
  seasons: number[];
  teams: NbaTeam[];
  players: NbaPlayer[];
  games: NbaGame[];
  models: Record<string, NbaModel>;
  sources: {
    dataset: string;
    rows: number;
    fetched: string;
    metadata: Record<string, unknown>;
  }[];
  shotCount: number;
  playerGameCount: number;
};
export type NbaShot = {
  id: number;
  gameId: string;
  playerId: number;
  teamId: number;
  x: number;
  y: number;
  distance: number;
  period: number;
  seconds: number;
  value: number;
  made: number;
  probability: number | null;
};
export type NbaGameLine = {
  gameId: string;
  playerId: number;
  teamId: number;
  date: string;
  metrics: NbaMetrics;
};
export const nbaLabel: Record<string, string> = {
  pts: "Puntos",
  reb: "Rebotes",
  ast: "Asistencias",
  stl: "Robos",
  blk: "Tapones",
  tov: "Pérdidas",
  min: "Minutos",
  gp: "Partidos",
  fg_pct: "TC%",
  fg3_pct: "T3%",
  ft_pct: "TL%",
  ts_pct: "TS%",
  efg_pct: "eFG%",
  usg_pct: "Uso%",
  off_rating: "OffRtg",
  def_rating: "DefRtg",
  net_rating: "NetRtg",
  pace: "Pace",
  oreb_pct: "REB ofensivo%",
  dreb_pct: "REB defensivo%",
  ast_pct: "AST%",
};
export const percentMetrics = new Set([
  "fg_pct",
  "fg3_pct",
  "ft_pct",
  "ts_pct",
  "efg_pct",
  "usg_pct",
  "oreb_pct",
  "dreb_pct",
  "ast_pct",
]);
export const nbaFormat = (n: number | null | undefined, digits = 1) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("es-ES", { maximumFractionDigits: digits }).format(
        n,
      );
export const nbaValue = (m: NbaMetrics, key: string) =>
  m[key] == null
    ? "—"
    : `${nbaFormat(m[key]! * (percentMetrics.has(key) ? 100 : 1))}${percentMetrics.has(key) ? "%" : ""}`;
export const nbaSeason = (year: number) =>
  `${year}-${String(year + 1).slice(-2)}`;
export const nbaToday = (now = new Date()) =>
  now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
export const nbaProbability = (p: number) =>
  p < 0.0005 ? "<0,1%" : p >= 0.9995 ? ">99,9%" : `${nbaFormat(p * 100)}%`;
export const nbaDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const foldName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
export function nbaSeasonParam(value: string) {
  const n = Number(value);
  return /^\d{4}$/.test(value) && n >= 1996 && n <= new Date().getUTCFullYear()
    ? n
    : null;
}
export function orderedNbaGames(
  games: NbaGame[],
  view: "upcoming" | "results" | "season",
  today: string,
) {
  return games
    .filter((g) =>
      view === "upcoming"
        ? g.status === "scheduled" && g.date >= today
        : view === "results"
          ? g.status === "finished"
          : true,
    )
    .toSorted(
      (a, b) =>
        (view === "results"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date)) || a.id.localeCompare(b.id),
    );
}
