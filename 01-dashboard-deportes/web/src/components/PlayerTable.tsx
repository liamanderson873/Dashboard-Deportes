"use client";

import Link from "next/link";
import { useState } from "react";
import {
  metricValue,
  type Aggregate,
  type Metric,
  type PlayerData,
} from "@/lib/player-analytics";
import { pe, fmt, positionLabel } from "@/lib/players-es";
import { FootballTeamLogo } from "./TeamCrest";
import { button } from "./PlayerShared";

export function PlayerTable({
  rows,
  base,
  teams,
  per90,
  starred,
  onStar,
  extraMetric,
}: {
  rows: Aggregate[];
  base: string;
  teams: PlayerData["teams"];
  per90: boolean;
  starred: number[];
  onStar: (id: number) => void;
  extraMetric?: Metric;
}) {
  const [limit, setLimit] = useState(50);
  const defaultColumns: Metric[] = [
    "goals",
    "assists",
    "shots",
    "keyPasses",
    "yellow",
  ];
  const columns =
    extraMetric && !defaultColumns.includes(extraMetric)
      ? [...defaultColumns, extraMetric]
      : defaultColumns;
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-card">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{pe.title}</caption>
        <thead className="bg-surface-2">
          <tr>
            {[
              pe.player,
              pe.team,
              pe.position,
              pe.minutes,
              ...columns.map((k) => pe.metrics[k]),
              pe.star,
            ].map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-3 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((r) => (
            <tr
              key={r.player.id}
              className="border-t border-border hover:bg-surface-2/60"
            >
              <th scope="row" className="min-w-40 px-3 py-2">
                <Link
                  className="font-semibold text-accent hover:underline"
                  href={`${base}/jugador/${r.player.id}`}
                >
                  {r.player.name}
                </Link>
              </th>
              <td className="min-w-32 px-3 py-2">
                {[...new Set([...r.teamIds, ...r.player.teamIds])].some((id) =>
                  teams.some((t) => t.id === id),
                )
                  ? [...new Set([...r.teamIds, ...r.player.teamIds])].map(
                      (id) => {
                        const team = teams.find((t) => t.id === id);
                        return team ? (
                          <span
                            key={id}
                            className="my-1 flex items-center gap-2"
                          >
                            <FootballTeamLogo
                              id={team.localId}
                              name={team.name}
                            />
                            <span>{team.name}</span>
                          </span>
                        ) : null;
                      },
                    )
                  : pe.missing}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {positionLabel(r.player.position)}
              </td>
              <td className="num px-3 py-2 text-right">{fmt(r.minutes, 0)}</td>
              {columns.map((k) => (
                <td
                  key={k}
                  className="num px-3 py-2 text-right"
                  title={`${r.coveredMatches[k]}/${r.matches} ${pe.observed}`}
                >
                  {fmt(metricValue(r, k, per90))}
                </td>
              ))}
              <td className="px-3 py-1">
                <button
                  className={button}
                  aria-label={`${starred.includes(r.player.id) ? pe.unstar : pe.star} ${r.player.name}`}
                  aria-pressed={starred.includes(r.player.id)}
                  onClick={() => onStar(r.player.id)}
                >
                  {starred.includes(r.player.id) ? "★" : "☆"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p role="status" className="p-5 text-muted">
          {pe.noResults}
        </p>
      )}
      {rows.length > limit && (
        <button
          type="button"
          className={`${button} m-3`}
          onClick={() => setLimit((n) => n + 50)}
        >
          Mostrar más jugadores · {rows.length - limit} restantes
        </button>
      )}
    </div>
  );
}
