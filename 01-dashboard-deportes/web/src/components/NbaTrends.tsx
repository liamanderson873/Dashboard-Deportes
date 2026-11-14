"use client";
import { numericAxis } from "@/lib/nba-visuals";
import { usePlotWidth } from "./usePlotWidth";
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
  const series = recent
    .toReversed()
    .map((l) => ({ ...l, value: trendValue([l], metric) }));
  const points = series.filter((l) => l.value !== null);
  const axis = numericAxis([...series.map((l) => l.value), baseline]);
  const { ref, width } = usePlotWidth(sorted.length > 0);
  const height = 300,
    left = 56,
    right = 16,
    top = 24,
    bottom = 50;
  const sx = (i: number) =>
    left +
    (series.length > 1 ? i / (series.length - 1) : 0.5) *
      (width - left - right);
  const sy = (value: number) =>
    height -
    bottom -
    ((value - axis.min) / axis.span) * (height - top - bottom);
  const dateTicks = [
    ...new Set([
      0,
      ...(width >= 480 ? [Math.floor((series.length - 1) / 2)] : []),
      series.length - 1,
    ]),
  ];
  const compactDate = (date: string) =>
    new Date(date + "T12:00:00Z").toLocaleDateString("es-ES", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
    });
  const segments = series
    .reduce<{ x: number; y: number }[][]>((groups, p, i) => {
      if (p.value === null) {
        if (groups.at(-1)?.length) groups.push([]);
      } else {
        if (!groups.length) groups.push([]);
        groups.at(-1)!.push({ x: sx(i), y: sy(p.value) });
      }
      return groups;
    }, [])
    .filter((g) => g.length > 1);
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
      <div ref={ref} className="mb-4 min-w-0">
        {!!points.length && (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={height}
            role="img"
            aria-label={`${trendLabels[metric]} por partido. Eje vertical de ${axis.min} a ${axis.max}. Línea discontinua: media de temporada. Valores exactos en la tabla inferior.`}
          >
            <g>
              {axis.ticks.map((value) => (
                <g key={value}>
                  <path
                    d={`M${left} ${sy(value)}H${width - right}`}
                    stroke="var(--border)"
                    strokeDasharray={value === 0 ? undefined : "3 4"}
                  />
                  <text
                    x={left - 10}
                    y={sy(value) + 4}
                    textAnchor="end"
                    fontSize="12"
                    className="num"
                    fill="var(--muted)"
                  >
                    {nbaFormat(value, axis.step < 1 ? 2 : 0)}
                  </text>
                </g>
              ))}
            </g>
            <text x={left} y="14" fontSize="12" fill="var(--muted)">
              {metric.endsWith("pct")
                ? "Porcentaje (%)"
                : metric === "min"
                  ? "Minutos"
                  : metric.includes("est")
                    ? trendLabels[metric]
                    : metric === "pts"
                      ? "Puntos"
                      : metric === "ast"
                        ? "Asistencias"
                        : "Rebotes"}
            </text>
            <path
              d={`M${left} ${top}V${height - bottom}H${width - right}`}
              stroke="var(--border-strong)"
              fill="none"
            />
            {baseline !== null && (
              <path
                d={`M${left} ${sy(baseline)}H${width - right}`}
                stroke="var(--subtle)"
                strokeDasharray="6 5"
              />
            )}
            {segments.map((segment, i) => (
              <polyline
                key={i}
                points={segment.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
              />
            ))}
            {series.map((p, i) =>
              p.value === null ? null : (
                <g key={p.gameId}>
                  <circle
                    cx={sx(i)}
                    cy={sy(p.value)}
                    r="4.5"
                    fill="var(--accent)"
                  >
                    <title>
                      {nbaDate(p.date)} · {nbaFormat(p.value)}
                    </title>
                  </circle>
                  {series.length <= 10 &&
                    (width - left - right) / Math.max(1, series.length - 1) >
                      38 && (
                      <text
                        x={sx(i)}
                        y={
                          sy(p.value) < top + 22
                            ? sy(p.value) + 17
                            : sy(p.value) - 10
                        }
                        textAnchor="middle"
                        fontSize="12"
                        fill="var(--fg)"
                        className="num"
                      >
                        {nbaFormat(p.value)}
                      </text>
                    )}
                </g>
              ),
            )}
            {dateTicks.map(
              (i) =>
                series[i] && (
                  <text
                    key={i}
                    x={sx(i)}
                    y={height - bottom + 25}
                    textAnchor={
                      i === 0
                        ? "start"
                        : i === series.length - 1
                          ? "end"
                          : "middle"
                    }
                    fontSize="12"
                    fill="var(--muted)"
                  >
                    {compactDate(series[i].date)}
                  </text>
                ),
            )}
          </svg>
        )}
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-subtle">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-6 bg-accent" />
            Valor en cada partido
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-6 border-t-2 border-dashed border-subtle"
            />
            Media de temporada: {nbaFormat(baseline)}
          </span>
        </p>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-subtle">
        {recent.length} de {sorted.length} partidos disponibles; {points.length}{" "}
        con la métrica seleccionada. Los registros sin esa cifra dejan un hueco
        en la línea. eFG% y TS% se calculan con los intentos acumulados, no
        promediando porcentajes. Los ratings y pace de equipo son estimaciones
        de box score, ajustadas por posesiones y minutos; no son los ratings
        oficiales del panel.
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
