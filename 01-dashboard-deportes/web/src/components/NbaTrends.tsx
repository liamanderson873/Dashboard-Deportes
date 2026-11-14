"use client";
import { useState } from "react";
import { nbaDate, nbaFormat } from "@/lib/nba";
import {
  trendValue,
  trendLabels,
  type TrendLine,
  type TrendMetric,
} from "@/lib/nba-trends";
export function NbaTrends({
  lines,
  kind,
}: {
  lines: TrendLine[];
  kind: "team" | "player";
}) {
  const [window, setWindow] = useState("10"),
    [metric, setMetric] = useState<TrendMetric>("pts");
  const sorted = lines.toSorted(
    (a, b) => b.date.localeCompare(a.date) || b.gameId.localeCompare(a.gameId),
  );
  const recent = window === "season" ? sorted : sorted.slice(0, Number(window)),
    baseline = trendValue(sorted, metric),
    current = trendValue(recent, metric);
  const keys: TrendMetric[] =
    kind === "team"
      ? ["pts", "off_est", "def_est", "pace_est", "efg_pct"]
      : ["pts", "reb", "ast", "min", "efg_pct", "ts_pct"];
  const points = recent
    .toReversed()
    .map((l) => ({ ...l, value: trendValue([l], metric) }))
    .filter((l) => l.value !== null);
  const max = Math.max(...points.map((p) => p.value!), baseline ?? 0, 1),
    min = Math.min(...points.map((p) => p.value!), baseline ?? 0, 0),
    range = max - min || 1;
  if (!sorted.length)
    return (
      <p className="my-5 text-sm text-muted">
        Sin registros suficientes para comparar tendencias.
      </p>
    );
  return (
    <section
      aria-label="Tendencias recientes"
      className="my-7 rounded-panel border border-border bg-card p-4 sm:p-5"
    >
      <h2 className="display mb-4 text-2xl font-bold">
        Forma reciente frente a la temporada
      </h2>
      <div className="mb-5 flex flex-wrap gap-4">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Periodo</span>
          <select
            className="min-h-11 rounded-control border border-border-strong bg-card px-3 text-base sm:text-sm"
            value={window}
            onChange={(e) => setWindow(e.target.value)}
          >
            <option value="5">Últimos 5 partidos</option>
            <option value="10">Últimos 10 partidos</option>
            <option value="season">Temporada registrada</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Estadística</span>
          <select
            className="min-h-11 max-w-full rounded-control border border-border-strong bg-card px-3 text-base sm:text-sm"
            value={metric}
            onChange={(e) => setMetric(e.target.value as TrendMetric)}
          >
            {keys.map((k) => (
              <option key={k} value={k}>
                {trendLabels[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Periodo seleccionado", current],
          ["Media de temporada", baseline],
          [
            "Diferencia",
            current === null || baseline === null ? null : current - baseline,
          ],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-control bg-surface-2 p-4">
            <p className="eyebrow">{label}</p>
            <p className="score mt-3 text-3xl">
              {value === null ? "—" : nbaFormat(Number(value))}
            </p>
          </div>
        ))}
      </div>
      {points.length > 1 && (
        <svg
          viewBox="0 0 640 170"
          role="img"
          aria-label={`${trendLabels[metric]} por partido. Línea discontinua: media de temporada. Valores exactos en la tabla inferior.`}
          className="mb-3 h-44 w-full"
        >
          <path d="M15 145h610" stroke="var(--border-strong)" />
          {baseline !== null && (
            <path
              d={`M15 ${140 - ((baseline - min) * 115) / range}h610`}
              stroke="var(--subtle)"
              strokeDasharray="5 5"
            />
          )}
          <polyline
            points={points
              .map(
                (p, i) =>
                  `${15 + (i * 610) / (points.length - 1)},${140 - ((p.value! - min) * 115) / range}`,
              )
              .join(" ")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
          />
          {points.map((p, i) => (
            <circle
              key={p.gameId}
              cx={15 + (i * 610) / (points.length - 1)}
              cy={140 - ((p.value! - min) * 115) / range}
              r="4"
              fill="var(--accent)"
            >
              <title>
                {nbaDate(p.date)} · {nbaFormat(p.value!)}
              </title>
            </circle>
          ))}
        </svg>
      )}
      <p className="mb-4 text-xs leading-relaxed text-subtle">
        {recent.length} de {sorted.length} partidos disponibles. eFG% y TS% se
        calculan con los intentos acumulados, no promediando porcentajes. Los
        ratings y pace de equipo son estimaciones de box score, ajustadas por
        posesiones y minutos; no son los ratings oficiales del panel.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Comparación de cinco, diez y todos los partidos
          </caption>
          <thead>
            <tr>
              <th className="py-3">Estadística</th>
              <th className="p-3">Últimos 5</th>
              <th className="p-3">Últimos 10</th>
              <th className="p-3">Temporada</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k} className="border-t border-border">
                <th scope="row" className="min-w-40 py-3 font-medium">
                  {trendLabels[k]}
                </th>
                {[sorted.slice(0, 5), sorted.slice(0, 10), sorted].map(
                  (slice, i) => (
                    <td key={i} className="num p-3">
                      {nbaFormat(trendValue(slice, k))}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="mt-4">
        <summary className="min-h-11 text-sm font-semibold">
          Valores del gráfico por partido
        </summary>
        <div className="mt-3 max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Fecha</th>
                <th>{trendLabels[metric]}</th>
              </tr>
            </thead>
            <tbody>
              {recent.toReversed().map((l) => (
                <tr key={l.gameId} className="border-t border-border">
                  <th scope="row" className="py-2 font-normal">
                    {nbaDate(l.date)}
                  </th>
                  <td className="num">{nbaFormat(trendValue([l], metric))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
