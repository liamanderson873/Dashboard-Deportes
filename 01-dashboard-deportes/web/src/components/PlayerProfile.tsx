"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  aggregatePlayers,
  ageAt,
  metricKeys,
  metricValue,
  percentile,
  similarPlayers,
  type Aggregate,
  type Metric,
  type PlayerData,
} from "@/lib/player-analytics";
import { pe, fmt, positionLabel } from "@/lib/players-es";
import { nationalityLabel } from "@/lib/translate";
import { Field, button, control } from "./PlayerShared";
import { PlayerStar } from "./PlayerFollow";
import { Coverage } from "./TeamPlayerStats";

export function Comparison({
  one,
  two,
  per90,
  cohort,
  minimum,
}: {
  one: Aggregate;
  two: Aggregate;
  per90: boolean;
  cohort: Aggregate[];
  minimum: number;
}) {
  return (
    <>
      <div className="overflow-x-auto rounded-panel border border-border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{pe.tabs.comparar}</caption>
          <thead>
            <tr className="bg-surface-2">
              <th className="p-3">Estadística</th>
              <th className="p-3">{one.player.name}</th>
              <th className="p-3">{two.player.name}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="p-3">{pe.minutes}</th>
              <td className="num p-3">{fmt(one.minutes, 0)}</td>
              <td className="num p-3">{fmt(two.minutes, 0)}</td>
            </tr>
            {metricKeys.map((k) => (
              <tr key={k} className="border-t border-border">
                <th scope="row" className="p-3">
                  {pe.metrics[k]}
                </th>
                {[one, two].map((r) => {
                  const pc = percentile(r, cohort, k, minimum);
                  return (
                    <td key={r.player.id} className="num p-3">
                      <strong>{fmt(metricValue(r, k, per90))}</strong>
                      <span className="mt-1 block text-xs text-subtle">
                        {r.coveredMatches[k]}/{r.matches} {pe.observed}
                        {pc ? ` · P${fmt(pc.value, 0)} (n=${pc.size})` : ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-subtle">{pe.percentile}</p>
    </>
  );
}
export function PlayerProfile({
  data,
  id,
  base,
  today,
}: {
  data: PlayerData;
  id: number;
  base: string;
  today: string;
}) {
  const [period, setPeriod] = useState<"season" | "five">("season"),
    [per90, setPer90] = useState(false);
  const rows = useMemo(
    () => aggregatePlayers(data.players, data.appearances, period),
    [data, period],
  );
  const row = rows.find((r) => r.player.id === id);
  if (!row) return null;
  const log = data.appearances
    .filter((a) => a.playerId === id && a.minutes !== null && a.minutes > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const similar = similarPlayers(row, rows, period === "five" ? 90 : 180);
  const points = [...log].reverse().reduce<{ x: number; y: number }[]>(
    (acc, r) => [
      ...acc,
      {
        x: acc.length + 1,
        y:
          (acc.at(-1)?.y ?? 0) +
          (r.metrics.goals ?? 0) +
          (r.metrics.assists ?? 0),
      },
    ],
    [],
  );
  const total = points.at(-1)?.y ?? 0;
  const allGcaKnown = log.every(
    (a) => a.metrics.goals != null && a.metrics.assists != null,
  );
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted">
          {positionLabel(row.player.position)} ·{" "}
          {fmt(ageAt(row.player.birth, today), 0)} años ·{" "}
          {nationalityLabel(row.player.nationality) ?? pe.missing}
        </p>
        <PlayerStar id={id} />
      </div>
      <Coverage data={data} />
      <div className="mb-5 flex flex-wrap gap-3">
        <Field label={pe.period}>
          <select
            className={control}
            value={period}
            onChange={(e) => setPeriod(e.target.value as "season" | "five")}
          >
            <option value="season">{pe.season}</option>
            <option value="five">{pe.five}</option>
          </select>
        </Field>
        <Field label={pe.mode}>
          <select
            className={control}
            value={per90 ? "90" : "total"}
            onChange={(e) => setPer90(e.target.value === "90")}
          >
            <option value="total">{pe.totals}</option>
            <option value="90">{pe.per90}</option>
          </select>
        </Field>
        <Link
          className={`${button} self-end`}
          href={`${base}/jugadores?tab=comparar&a=${id}`}
        >
          {pe.tabs.comparar}
        </Link>
      </div>
      <p className="mb-5 text-sm text-muted">
        {fmt(row.minutes, 0)} minutos · {row.matches} partidos ·{" "}
        {row.teamIds
          .map((id) => data.teams.find((t) => t.id === id)?.name)
          .join(" · ")}
      </p>
      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {metricKeys.map((k) => (
          <div key={k} className="bg-card p-4">
            <p className="eyebrow">{pe.metrics[k]}</p>
            <p className="score my-2 text-3xl">
              {fmt(metricValue(row, k, per90))}
            </p>
            <p className="text-xs text-subtle">
              {row.coveredMatches[k]}/{row.matches} {pe.observed}
            </p>
          </div>
        ))}
      </div>
      <p className="mb-8 text-xs text-subtle">{pe.formula}</p>
      {points.length > 1 && allGcaKnown && (
        <section className="mb-8">
          <h2 className="display mb-3 text-2xl font-bold">{pe.evolution}</h2>
          <svg
            role="img"
            aria-label={`${pe.evolution}: ${total}`}
            viewBox="0 0 600 160"
            className="max-h-52 w-full rounded-panel border border-border bg-card"
          >
            <line
              x1="30"
              y1="135"
              x2="580"
              y2="135"
              stroke="var(--border-strong)"
            />
            <polyline
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              points={points
                .map(
                  (p, i) =>
                    `${30 + (i * 550) / (points.length - 1)},${135 - (p.y * 110) / Math.max(1, total)}`,
                )
                .join(" ")}
            />
            <text x="30" y="152" fontSize="12">
              1
            </text>
            <text x="560" y="152" fontSize="12">
              {points.length} PJ
            </text>
            <text x="30" y="18" fontSize="12">
              {total} G+A
            </text>
          </svg>
          <p className="mt-2 text-xs text-subtle">
            Acumulado de goles y asistencias de la temporada. Valores exactos en
            el registro inferior.
          </p>
        </section>
      )}
      <section className="mb-8">
        <h2 className="display mb-3 text-2xl font-bold">{pe.similar}</h2>
        <p className="mb-3 text-sm text-muted">{pe.similarity}</p>
        {similar.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {similar.map((s) => (
              <li
                className="rounded-panel border border-border bg-card p-4"
                key={s.row.player.id}
              >
                <Link
                  className="font-semibold text-accent hover:underline"
                  href={`${base}/jugador/${s.row.player.id}`}
                >
                  {s.row.player.name}
                </Link>
                <p className="num text-sm">
                  {fmt(s.score, 0)}/100 ·{" "}
                  {s.metrics.map((k) => pe.metrics[k]).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-muted">{pe.noSimilar}</p>
        )}
      </section>
      <h2 className="display mb-3 text-2xl font-bold">{pe.recent}</h2>
      <div className="overflow-x-auto rounded-panel border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2">
            <tr>
              {[
                pe.match,
                pe.team,
                pe.minutes,
                pe.metrics.goals,
                pe.metrics.assists,
                pe.metrics.xg,
              ].map((h) => (
                <th className="p-3" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {log.map((r) => {
              const m = data.matches.find((m) => m.id === r.matchId);
              return (
                <tr className="border-t border-border" key={r.matchId}>
                  <th className="min-w-52 p-3" scope="row">
                    <Link
                      className="text-accent hover:underline"
                      href={`${base}/partido/${r.matchId}`}
                    >
                      {m ? `${m.home} · ${m.away}` : r.date.slice(0, 10)}
                    </Link>
                    <span className="block text-xs font-normal text-subtle">
                      {r.date.slice(0, 10)}
                    </span>
                  </th>
                  <td className="p-3">
                    {data.teams.find((t) => t.id === r.teamId)?.name}
                  </td>
                  <td className="num p-3">{fmt(r.minutes, 0)}</td>
                  {(["goals", "assists", "xg"] as Metric[]).map((k) => (
                    <td key={k} className="num p-3">
                      {fmt(r.metrics[k])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!log.length && <p className="p-4">{pe.empty}</p>}
      </div>
    </>
  );
}
