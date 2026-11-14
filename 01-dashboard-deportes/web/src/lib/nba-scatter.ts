import { type NbaPlayer } from "./nba";
export const scatterMetrics = {
  pts: {
    label: "Puntos por partido",
    short: "PTS",
    unit: "puntos",
    percent: false,
    higher: true,
  },
  ts_pct: {
    label: "Eficiencia de tiro · TS%",
    short: "TS%",
    unit: "%",
    percent: true,
    higher: true,
  },
  efg_pct: {
    label: "Tiro efectivo · eFG%",
    short: "eFG%",
    unit: "%",
    percent: true,
    higher: true,
  },
  reb: {
    label: "Rebotes por partido",
    short: "REB",
    unit: "rebotes",
    percent: false,
    higher: true,
  },
  ast: {
    label: "Asistencias por partido",
    short: "AST",
    unit: "asistencias",
    percent: false,
    higher: true,
  },
  stl: {
    label: "Robos por partido",
    short: "ROB",
    unit: "robos",
    percent: false,
    higher: true,
  },
  blk: {
    label: "Tapones por partido",
    short: "TAP",
    unit: "tapones",
    percent: false,
    higher: true,
  },
  tov: {
    label: "Pérdidas por partido",
    short: "TOV",
    unit: "pérdidas",
    percent: false,
    higher: false,
  },
  min: {
    label: "Minutos por partido",
    short: "MIN",
    unit: "minutos",
    percent: false,
    higher: true,
  },
  gp: {
    label: "Partidos jugados",
    short: "PJ",
    unit: "partidos",
    percent: false,
    higher: true,
  },
  fg_pct: {
    label: "Acierto en tiros de campo · TC%",
    short: "TC%",
    unit: "%",
    percent: true,
    higher: true,
  },
  fg3_pct: {
    label: "Acierto en triples · T3%",
    short: "T3%",
    unit: "%",
    percent: true,
    higher: true,
  },
  fg3a: {
    label: "Triples intentados por partido",
    short: "T3A",
    unit: "intentos",
    percent: false,
    higher: true,
  },
  fta: {
    label: "Tiros libres intentados por partido",
    short: "TLA",
    unit: "intentos",
    percent: false,
    higher: true,
  },
  usg_pct: {
    label: "Uso ofensivo · USG%",
    short: "USG%",
    unit: "%",
    percent: true,
    higher: true,
  },
  ast_pct: {
    label: "Porcentaje de asistencias · AST%",
    short: "AST%",
    unit: "%",
    percent: true,
    higher: true,
  },
  reb_pct: {
    label: "Porcentaje de rebotes · REB%",
    short: "REB%",
    unit: "%",
    percent: true,
    higher: true,
  },
  off_rating: {
    label: "Rating ofensivo en pista",
    short: "OffRtg",
    unit: "pts/100 pos.",
    percent: false,
    higher: true,
  },
  def_rating: {
    label: "Rating defensivo en pista",
    short: "DefRtg",
    unit: "pts/100 pos.",
    percent: false,
    higher: false,
  },
  net_rating: {
    label: "Rating neto en pista",
    short: "NetRtg",
    unit: "pts/100 pos.",
    percent: false,
    higher: true,
  },
  pie: {
    label: "Player Impact Estimate · PIE",
    short: "PIE",
    unit: "%",
    percent: true,
    higher: true,
  },
} as const;
export type ScatterMetric = keyof typeof scatterMetrics;
export type ScatterRule = {
  metric: ScatterMetric;
  operator: "gte" | "lte";
  value: number;
};
export type ScatterPoint = { player: NbaPlayer; x: number; y: number };
export function isScatterMetric(key: string): key is ScatterMetric {
  return Object.hasOwn(scatterMetrics, key);
}
export function scatterValue(
  player: NbaPlayer,
  key: ScatterMetric,
): number | null {
  const raw = player.metrics[key];
  return raw === null || raw === undefined || !Number.isFinite(raw)
    ? null
    : raw * (scatterMetrics[key].percent ? 100 : 1);
}
export function parseScatterRules(text: string): ScatterRule[] {
  if (text.length > 600) return [];
  return text
    .split("|")
    .slice(0, 6)
    .flatMap((entry) => {
      const [metric, operator, raw] = entry.split(":");
      if (
        !isScatterMetric(metric) ||
        (operator !== "gte" && operator !== "lte") ||
        raw === undefined ||
        raw.trim() === ""
      )
        return [];
      const value = Number(raw);
      return Number.isFinite(value) && Math.abs(value) <= 10000
        ? [{ metric, operator, value }]
        : [];
    });
}
export function serializeScatterRules(rules: ScatterRule[]) {
  return rules.map((r) => `${r.metric}:${r.operator}:${r.value}`).join("|");
}
export function scatterCohort(
  players: NbaPlayer[],
  x: ScatterMetric,
  y: ScatterMetric,
  filters: {
    team: string;
    position: string;
    minGames: number;
    minMinutes: number;
    rules: ScatterRule[];
  },
) {
  const eligible = players.filter(
    (p) =>
      (!filters.team || String(p.teamId) === filters.team) &&
      (!filters.position || p.position?.includes(filters.position)) &&
      (filters.minGames <= 0 ||
        (p.metrics.gp != null && p.metrics.gp >= filters.minGames)) &&
      (filters.minMinutes <= 0 ||
        (p.metrics.min != null && p.metrics.min >= filters.minMinutes)) &&
      filters.rules.every((rule) => {
        const value = scatterValue(p, rule.metric);
        return (
          value !== null &&
          (rule.operator === "gte" ? value >= rule.value : value <= rule.value)
        );
      }),
  );
  const points = eligible.flatMap((player) => {
    const xv = scatterValue(player, x),
      yv = scatterValue(player, y);
    return xv === null || yv === null ? [] : [{ player, x: xv, y: yv }];
  });
  return {
    points,
    missing: eligible.length - points.length,
    eligible: eligible.length,
  };
}
export function sortScatter(
  points: ScatterPoint[],
  axis: "x" | "y",
  metric: ScatterMetric,
) {
  return points.toSorted(
    (a, b) =>
      (scatterMetrics[metric].higher ? b[axis] - a[axis] : a[axis] - b[axis]) ||
      a.player.name.localeCompare(b.player.name),
  );
}
