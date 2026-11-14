"use client";

import Link from "next/link";
import { useState } from "react";
import { type NbaData, nbaFormat, nbaValue } from "@/lib/nba";
import { NbaTeamLogo } from "./TeamCrest";
import { Badge, button } from "./NbaShared";

export function NbaStandings({ data }: { data: NbaData }) {
  const [conference, setConference] = useState("Este");
  const rows = data.teams
    .filter((t) => t.conference === conference)
    .toSorted(
      (a, b) =>
        (b.metrics.w_pct ?? 0) - (a.metrics.w_pct ?? 0) ||
        (b.metrics.net_rating ?? 0) - (a.metrics.net_rating ?? 0),
    );
  const leader = rows[0];
  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          [
            "Líder de conferencia",
            leader?.name ?? "—",
            `${leader?.metrics.w ?? "—"} victorias · ${leader?.metrics.l ?? "—"} derrotas`,
          ],
          [
            "Mejor ataque",
            data.teams.toSorted(
              (a, b) =>
                (b.metrics.off_rating ?? 0) - (a.metrics.off_rating ?? 0),
            )[0]?.name ?? "—",
            "Por puntos anotados cada 100 posesiones",
          ],
          [
            "Muestra de temporada",
            `${data.games.filter((g) => g.status === "finished").length} partidos`,
            "Datos hasta la última descarga",
          ],
        ].map(([label, value, note]) => (
          <div
            key={label}
            className="stat-card rounded-panel border border-border bg-card p-5"
          >
            <p className="eyebrow">{label}</p>
            <div className="mt-3 flex items-center gap-3">
              {data.teams.find((t) => t.name === value) && (
                <NbaTeamLogo
                  id={data.teams.find((t) => t.name === value)?.id}
                  size={44}
                />
              )}
              <p className="display text-2xl font-bold">{value}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-subtle">{note}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Conferencia NBA" className="flex gap-2">
          {["Este", "Oeste"].map((c) => (
            <button
              type="button"
              key={c}
              aria-pressed={conference === c}
              onClick={() => setConference(c)}
              className={`${button} ${conference === c ? "!border-accent !bg-accent-soft !text-accent" : ""}`}
            >
              Conferencia {c}
            </button>
          ))}
        </div>
        <span className="text-xs text-subtle">
          1–6 acceso directo · 7–10 play-in
        </span>
      </div>
      <div className="overflow-x-auto rounded-panel border border-border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Clasificación NBA, conferencia {conference}
          </caption>
          <thead className="bg-surface-2">
            <tr>
              {[
                "#",
                "Equipo",
                "PJ",
                "V",
                "D",
                "Victorias%",
                "OffRtg",
                "DefRtg",
                "NetRtg",
                "Pace",
              ].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((team, i) => (
              <tr
                key={team.id}
                className="border-t border-border hover:bg-surface-2/50"
              >
                <td className="px-3 py-3">
                  <span
                    className={`num inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < 6 ? "bg-accent-soft text-accent" : i < 10 ? "bg-surface-2 text-fg" : "text-muted"}`}
                  >
                    {i + 1}
                  </span>
                </td>
                <th scope="row" className="min-w-56 px-3 py-3">
                  <Link
                    href={`/nba/${data.season}/equipo/${team.id}`}
                    className="flex items-center gap-3 font-semibold hover:text-accent"
                  >
                    <Badge team={team} />
                    {team.name}
                  </Link>
                </th>
                {["gp", "w", "l"].map((k) => (
                  <td key={k} className="num px-3 py-3">
                    {nbaValue(team.metrics, k)}
                  </td>
                ))}
                <td className="num px-3 py-3 font-semibold">
                  {nbaFormat((team.metrics.w_pct ?? 0) * 100)}%
                </td>
                {["off_rating", "def_rating", "net_rating", "pace"].map((k) => (
                  <td key={k} className="num px-3 py-3">
                    {nbaValue(team.metrics, k)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        Orden por porcentaje de victorias y NetRtg; los desempates oficiales
        pueden dar otro orden. OffRtg y DefRtg: puntos anotados y recibidos cada
        100 posesiones. Pace: posesiones por 48 minutos.
      </p>
    </>
  );
}
