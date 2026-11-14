"use client";

import Link from "next/link";
import { useState } from "react";
import {
  aggregatePlayers,
  metricKeys,
  metricValue,
  type Metric,
  type PlayerData,
} from "@/lib/player-analytics";
import { pe } from "@/lib/players-es";
import { togglePersonal } from "@/lib/personal-state";
import { Field, button, control, usePersonal } from "./PlayerShared";
import { PlayerTable } from "./PlayerTable";

export function TeamPlayerStats({
  data,
  teamId,
  base,
}: {
  data: PlayerData;
  teamId: number;
  base: string;
}) {
  const [sort, setSort] = useState<Metric | "minutes">("minutes");
  const { state, update, failed } = usePersonal();
  const rows = aggregatePlayers(
    data.players,
    data.appearances,
    "season",
    teamId,
  )
    .filter(
      (r) => r.player.teamIds.includes(teamId) || r.teamIds.includes(teamId),
    )
    .sort((a, b) => {
      const av = sort === "minutes" ? a.minutes : metricValue(a, sort, false),
        bv = sort === "minutes" ? b.minutes : metricValue(b, sort, false);
      return av === null
        ? bv === null
          ? a.player.id - b.player.id
          : 1
        : bv === null
          ? -1
          : bv - av || a.player.id - b.player.id;
    });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label={pe.order}>
          <select
            className={control}
            value={sort}
            onChange={(e) => setSort(e.target.value as Metric | "minutes")}
          >
            <option value="minutes">{pe.minutes}</option>
            {metricKeys.map((k) => (
              <option key={k} value={k}>
                {pe.metrics[k]}
              </option>
            ))}
          </select>
        </Field>
        <Link
          className={button}
          href={`${base}/jugadores?team=${teamId}&min=0`}
        >
          Explorar esta plantilla →
        </Link>
      </div>
      {failed && <p role="status">{pe.storageError}</p>}
      <PlayerTable
        rows={rows}
        base={base}
        teams={data.teams}
        per90={false}
        extraMetric={sort === "minutes" ? undefined : sort}
        starred={state.players}
        onStar={(id) => update((s) => togglePersonal(s, "players", id))}
      />
      <p className="mt-3 text-xs text-subtle">{pe.coverage}</p>
    </>
  );
}
export function Coverage({ data }: { data: PlayerData }) {
  const finished = data.matches.filter((m) => m.status === "finished").length;
  const covered = new Set(data.appearances.map((a) => a.matchId)).size;
  return (
    <details className="mb-6 rounded-panel border border-border bg-card px-4 py-3 text-sm">
      <summary className="cursor-pointer text-muted">
        <span className="font-semibold text-accent">Bzzoiro Sports Data</span> ·{" "}
        {covered}/{finished} partidos con registros individuales{" "}
        <span className="ml-2 text-xs">Ver cobertura</span>
        {data.imported && (
          <span className="mt-1 block text-xs">
            Importación individual:{" "}
            {new Date(data.imported).toLocaleDateString("es-ES", {
              timeZone: "Europe/Madrid",
            })}{" "}
            · Sin directo
          </span>
        )}
      </summary>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">{pe.coverage}</p>
      {data.imported && (
        <p className="mt-2 text-xs text-subtle">
          {pe.updated}:{" "}
          {new Date(data.imported).toLocaleString("es-ES", {
            timeZone: "Europe/Madrid",
          })}
        </p>
      )}
    </details>
  );
}
