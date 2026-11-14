import type { ForecastRecord } from "./queries/nba-lab";
export function forecastMetrics(rows: ForecastRecord[]) {
  const eligible = (r: ForecastRecord) => {
    const created = new Date(r.created);
    if (!Number.isFinite(created.getTime())) return false;
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(created);
    return day < r.date && r.cutoff < r.date;
  };
  const resolved = rows.filter(
    (r) =>
      eligible(r) &&
      r.status === "finished" &&
      r.homePts !== null &&
      r.awayPts !== null &&
      r.homePts !== r.awayPts &&
      Number.isFinite(r.probability) &&
      r.probability >= 0 &&
      r.probability <= 1,
  );
  if (!resolved.length) return null;
  let brier = 0,
    loss = 0,
    correct = 0;
  const bins = Array.from({ length: 5 }, (_, i) => ({
    from: i / 5,
    n: 0,
    predicted: 0,
    observed: 0,
  }));
  for (const row of resolved) {
    const y = Number(row.homePts! > row.awayPts!),
      p = Math.min(1 - 1e-6, Math.max(1e-6, row.probability));
    brier += (p - y) ** 2;
    loss -= y * Math.log(p) + (1 - y) * Math.log(1 - p);
    correct += Number(p >= 0.5 === (y === 1));
    const bin = bins[Math.min(4, Math.floor(row.probability * 5))];
    bin.n++;
    bin.predicted += row.probability;
    bin.observed += y;
  }
  return {
    n: resolved.length,
    brier: brier / resolved.length,
    logLoss: loss / resolved.length,
    accuracy: correct / resolved.length,
    bins: bins
      .filter((b) => b.n)
      .map((b) => ({
        ...b,
        predicted: b.predicted / b.n,
        observed: b.observed / b.n,
      })),
  };
}
