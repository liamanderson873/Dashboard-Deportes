import type { NbaMetrics, NbaShot } from "./nba";
export type TrendLine = {
  gameId: string;
  date: string;
  metrics: NbaMetrics;
  opponent?: NbaMetrics;
};
export type TrendMetric =
  | "pts"
  | "reb"
  | "ast"
  | "min"
  | "efg_pct"
  | "ts_pct"
  | "off_est"
  | "def_est"
  | "pace_est";
export const trendLabels: Record<TrendMetric, string> = {
  pts: "Puntos por partido",
  reb: "Rebotes por partido",
  ast: "Asistencias por partido",
  min: "Minutos por partido",
  efg_pct: "eFG%",
  ts_pct: "TS%",
  off_est: "OffRtg estimado",
  def_est: "DefRtg estimado",
  pace_est: "Pace estimado",
};
export function trendValue(
  lines: TrendLine[],
  metric: TrendMetric,
): number | null {
  const sum = (rows: TrendLine[], key: string) =>
    rows.reduce((n, r) => n + (r.metrics[key] ?? 0), 0);
  if (["pts", "reb", "ast", "min"].includes(metric)) {
    const valid = lines.filter((l) => l.metrics[metric] != null);
    return valid.length ? sum(valid, metric) / valid.length : null;
  }
  if (metric === "efg_pct") {
    const valid = lines.filter((l) =>
      ["fgm", "fg3m", "fga"].every((k) => l.metrics[k] != null),
    );
    const attempts = sum(valid, "fga");
    return attempts
      ? (100 * (sum(valid, "fgm") + 0.5 * sum(valid, "fg3m"))) / attempts
      : null;
  }
  if (metric === "ts_pct") {
    const valid = lines.filter((l) =>
      ["pts", "fga", "fta"].every((k) => l.metrics[k] != null),
    );
    const attempts = 2 * (sum(valid, "fga") + 0.44 * sum(valid, "fta"));
    return attempts ? (100 * sum(valid, "pts")) / attempts : null;
  }
  const valid = lines.filter(
    (l) =>
      l.opponent &&
      ["pts", "fga", "fta", "oreb", "tov", "min"].every(
        (k) => l.metrics[k] != null && l.opponent![k] != null,
      ),
  );
  let possessions = 0,
    points = 0,
    allowed = 0,
    minutes = 0;
  for (const l of valid) {
    const m = l.metrics,
      o = l.opponent!;
    possessions +=
      (m.fga! +
        0.44 * m.fta! -
        m.oreb! +
        m.tov! +
        (o.fga! + 0.44 * o.fta! - o.oreb! + o.tov!)) /
      2;
    points += m.pts!;
    allowed += o.pts!;
    minutes += m.min! / 5;
  }
  if (!possessions) return null;
  return metric === "off_est"
    ? (100 * points) / possessions
    : metric === "def_est"
      ? (100 * allowed) / possessions
      : minutes
        ? (48 * possessions) / minutes
        : null;
}
export const shotZoneLabels: Record<string, string> = {
  rim: "Cerca del aro · <4 pies",
  paint: "Pintura · 4–8 pies",
  mid: "Media distancia",
  corner: "Triple desde esquina",
  arc: "Triple frontal / lateral",
  heave: "Lanzamiento lejano · >35 pies",
};
export function shotZone(
  s: Pick<NbaShot, "distance" | "value" | "x" | "y">,
): string {
  if (s.distance > 35) return "heave";
  if (s.value === 3) return Math.abs(s.x) >= 22 && s.y <= 14 ? "corner" : "arc";
  return s.distance < 4 ? "rim" : s.distance < 8 ? "paint" : "mid";
}
export function zoneSummary(shots: NbaShot[]) {
  return Object.keys(shotZoneLabels).map((zone) => {
    const rows = shots.filter((s) => shotZone(s) === zone),
      pred = rows.filter((s) => s.probability !== null);
    return {
      zone,
      n: rows.length,
      made: rows.reduce((n, s) => n + s.made, 0),
      expected: pred.length
        ? pred.reduce((n, s) => n + s.probability!, 0) / pred.length
        : null,
      predicted: pred.length,
    };
  });
}
