"use client";
import Link from "next/link";
import { useState } from "react";
import { type NbaData, nbaFormat } from "@/lib/nba";
import {
  scatterMetrics,
  type ScatterMetric,
  type ScatterRule,
  type ScatterPoint,
} from "@/lib/nba-scatter";
import { PlayerPicker } from "./PlayerPicker";
import { NbaTeamLogo } from "./TeamCrest";

export const control =
  "min-h-11 min-w-0 max-w-full rounded-control border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-sm";
export const button =
  "inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-50";
export const metricOptions = Object.entries(scatterMetrics) as [
  ScatterMetric,
  (typeof scatterMetrics)[ScatterMetric],
][];
/** Value with one decimal, plus "%" for percentage metrics. */
export const formatMetric = (value: number, metric: ScatterMetric) =>
  `${nbaFormat(value, 1)}${scatterMetrics[metric].percent ? "%" : ""}`;

/** Form to add up to six "metric ≥/≤ value" conditions, and the list of active ones. */
export function ScatterRuleBuilder({
  rules,
  onAdd,
  onRemove,
}: {
  rules: ScatterRule[];
  onAdd: (rule: ScatterRule) => void;
  onRemove: (index: number) => void;
}) {
  const [ruleMetric, setRuleMetric] = useState<ScatterMetric>("pts"),
    [operator, setOperator] = useState<"gte" | "lte">("gte"),
    [ruleValue, setRuleValue] = useState("");
  return (
    <>
      <details className="mb-5 rounded-panel border border-border bg-card p-4">
        <summary className="min-h-11 font-semibold">
          Añadir condiciones estadísticas · {rules.length}/6
        </summary>
        <p className="mb-4 text-sm text-muted">
          Ejemplo: PTS ≥ 20 y TS% ≥ 60. Los porcentajes se introducen de 0 a
          100. Todas las condiciones deben cumplirse a la vez.
        </p>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="eyebrow">Estadística de la condición</span>
            <select
              className={control}
              value={ruleMetric}
              onChange={(e) => setRuleMetric(e.target.value as ScatterMetric)}
            >
              {metricOptions.map(([key, m]) => (
                <option key={key} value={key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="eyebrow">Comparación</span>
            <select
              className={control}
              value={operator}
              onChange={(e) => setOperator(e.target.value as "gte" | "lte")}
            >
              <option value="gte">Mayor o igual · ≥</option>
              <option value="lte">Menor o igual · ≤</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="eyebrow">
              Valor · {scatterMetrics[ruleMetric].unit}
            </span>
            <input
              className={control}
              type="number"
              min="-10000"
              max="10000"
              step="any"
              value={ruleValue}
              onChange={(e) => setRuleValue(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={button}
            disabled={
              rules.length >= 6 ||
              ruleValue.trim() === "" ||
              !Number.isFinite(Number(ruleValue)) ||
              Math.abs(Number(ruleValue)) > 10000
            }
            onClick={() => {
              onAdd({ metric: ruleMetric, operator, value: Number(ruleValue) });
              setRuleValue("");
            }}
          >
            Añadir condición
          </button>
        </div>
      </details>
      {!!rules.length && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {rules.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-control border border-accent bg-accent-soft pl-3 text-sm text-accent"
            >
              <span>
                {scatterMetrics[r.metric].short}{" "}
                {r.operator === "gte" ? "≥" : "≤"}{" "}
                {formatMetric(r.value, r.metric)}
              </span>
              <button
                type="button"
                className="min-h-11 min-w-11 px-2 font-semibold"
                aria-label={`Quitar condición ${scatterMetrics[r.metric].short} ${r.operator === "gte" ? "mayor o igual" : "menor o igual"} ${r.value}`}
                onClick={() => onRemove(i)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Leader of each axis in the filtered sample, plus how to read the chart. */
export function ScatterLeaders({
  x,
  y,
  leaderX,
  leaderY,
}: {
  x: ScatterMetric;
  y: ScatterMetric;
  leaderX: ScatterPoint | undefined;
  leaderY: ScatterPoint | undefined;
}) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      {[
        [
          `${scatterMetrics[x].higher ? "Mayor" : "Menor"} ${scatterMetrics[x].short}`,
          leaderX,
          x,
        ],
        [
          `${scatterMetrics[y].higher ? "Mayor" : "Menor"} ${scatterMetrics[y].short}`,
          leaderY,
          y,
        ],
      ].map(([label, point, key], i) => {
        const p = point as ScatterPoint | undefined;
        return (
          <div className="stat-card bg-card p-4" key={i}>
            <p className="eyebrow">{String(label)} · muestra filtrada</p>
            <p className="display mt-3 text-xl font-bold">
              {p?.player.name ?? "—"}
            </p>
            <p className="num mt-2 text-accent">
              {p
                ? formatMetric(key === x ? p.x : p.y, key as ScatterMetric)
                : "—"}
            </p>
          </div>
        );
      })}
      <div className="stat-card bg-card p-4">
        <p className="eyebrow">Cómo leer la comparación</p>
        <p className="mt-3 text-sm leading-relaxed">
          {scatterMetrics[x].short} aumenta hacia la derecha;{" "}
          {scatterMetrics[y].short} aumenta hacia arriba. En{" "}
          {!scatterMetrics[x].higher || !scatterMetrics[y].higher
            ? [
                ...new Set([
                  !scatterMetrics[x].higher ? scatterMetrics[x].short : "",
                  !scatterMetrics[y].higher ? scatterMetrics[y].short : "",
                ]),
              ]
                .filter(Boolean)
                .join(" y ")
            : "estas cifras"}{" "}
          {!scatterMetrics[x].higher || !scatterMetrics[y].higher
            ? "una cifra menor suele ser preferible."
            : "las cifras mayores muestran más volumen o eficiencia."}
        </p>
      </div>
    </div>
  );
}

/** Side panel: player search plus the figures of the hovered or selected player. */
export function ScatterDetail({
  data,
  points,
  x,
  y,
  selected,
  detail,
  onSelect,
}: {
  data: NbaData;
  points: ScatterPoint[];
  x: ScatterMetric;
  y: ScatterMetric;
  selected: string;
  detail: ScatterPoint | undefined;
  onSelect: (value: string) => void;
}) {
  return (
    <aside className="min-w-0 rounded-panel border border-border bg-card p-4">
      <PlayerPicker
        label="Seleccionar jugador en el gráfico"
        value={selected}
        onChange={onSelect}
        formatPosition={(p) => p ?? "Sin posición"}
        players={points.map(({ player: p }) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          birth: null,
          nationality: null,
          teamIds: [p.teamId],
        }))}
        teams={data.teams.map((t) => ({
          id: t.id,
          name: t.name,
          localId: null,
        }))}
      />
      {detail ? (
        <div className="mt-5">
          <div className="flex items-center gap-3">
            <NbaTeamLogo id={detail.player.teamId} size={44} />
            <div className="min-w-0">
              <h3 className="display text-xl font-bold">
                {detail.player.name}
              </h3>
              <p className="mt-1 text-xs text-subtle">
                {data.teams.find((t) => t.id === detail.player.teamId)?.name ??
                  "Varios equipos"}
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-3">
            {[
              [scatterMetrics[x].label, formatMetric(detail.x, x)],
              [scatterMetrics[y].label, formatMetric(detail.y, y)],
              [
                "Partidos / minutos por partido",
                `${nbaFormat(detail.player.metrics.gp, 0)} / ${nbaFormat(detail.player.metrics.min)}`,
              ],
            ].map(([label, value], index) => (
              <div key={index} className="border-t border-border pt-3">
                <dt className="text-xs text-subtle">{label}</dt>
                <dd className="num mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <Link
            className={`${button} mt-5 w-full text-accent`}
            href={`/nba/${data.season}/jugador/${detail.player.id}`}
          >
            Abrir ficha del jugador
          </Link>
        </div>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-muted">
          Elige un punto o busca un jugador para ver sus cifras y abrir su
          ficha.
          {selected
            ? " El jugador seleccionado ya no cumple los filtros actuales."
            : ""}
        </p>
      )}
    </aside>
  );
}

/** Sortable table with the exact figures of every plotted player. */
export function ScatterTable({
  data,
  rows,
  x,
  y,
  selected,
  order,
  onOrder,
  limit,
  onMore,
  onHighlight,
}: {
  data: NbaData;
  rows: ScatterPoint[];
  x: ScatterMetric;
  y: ScatterMetric;
  selected: string;
  order: "x" | "y";
  onOrder: (order: "x" | "y") => void;
  limit: number;
  onMore: () => void;
  onHighlight: (id: number) => void;
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h3 className="display text-xl font-bold">
          Clasificación de la muestra
        </h3>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Ordenar tabla por</span>
          <select
            className={control}
            value={order}
            onChange={(e) => onOrder(e.target.value as "x" | "y")}
          >
            <option value="x">Eje X · {scatterMetrics[x].short}</option>
            <option value="y">Eje Y · {scatterMetrics[y].short}</option>
          </select>
        </label>
      </div>
      <div className="relative overflow-x-auto rounded-panel border border-border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Jugadores representados y sus estadísticas exactas
          </caption>
          <thead className="bg-surface-2">
            <tr>
              {[
                "Jugador",
                scatterMetrics[x].short,
                scatterMetrics[y].short,
                "PJ",
                "MIN/PJ",
                "Gráfico",
              ].map((h, i) => (
                <th key={i} scope="col" className="whitespace-nowrap p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((p) => (
              <tr
                key={p.player.id}
                className={`border-t border-border ${String(p.player.id) === selected ? "bg-accent-soft" : "hover:bg-surface-2/50"}`}
              >
                <th scope="row" className="min-w-52 p-3">
                  <Link
                    href={`/nba/${data.season}/jugador/${p.player.id}`}
                    className="flex min-h-11 items-center gap-3 font-semibold hover:text-accent"
                  >
                    <NbaTeamLogo id={p.player.teamId} size={28} />
                    {p.player.name}
                  </Link>
                </th>
                <td className="num p-3">{formatMetric(p.x, x)}</td>
                <td className="num p-3">{formatMetric(p.y, y)}</td>
                <td className="num p-3">{nbaFormat(p.player.metrics.gp, 0)}</td>
                <td className="num p-3">{nbaFormat(p.player.metrics.min)}</td>
                <td className="p-3">
                  <button
                    type="button"
                    className={button}
                    aria-label={`Destacar ${p.player.name} en el gráfico`}
                    aria-pressed={selected === String(p.player.id)}
                    onClick={() => onHighlight(p.player.id)}
                  >
                    Destacar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > limit && (
          <button type="button" className={`${button} m-3`} onClick={onMore}>
            Mostrar más · {rows.length - limit} restantes
          </button>
        )}
      </div>
    </>
  );
}
