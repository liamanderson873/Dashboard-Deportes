"use client";

import Link from "next/link";
import { useState } from "react";
import {
  type NbaData,
  type NbaTeam,
  nbaDate,
  nbaFormat,
  orderedNbaGames,
  nbaToday,
} from "@/lib/nba";
import { Badge, button, control } from "./NbaShared";

export function NbaGameCards({
  data,
  teamIds,
}: {
  data: NbaData;
  teamIds?: number[];
}) {
  const today = nbaToday();
  const scope = data.games.filter(
    (g) => !teamIds || teamIds.includes(g.homeId) || teamIds.includes(g.awayId),
  );
  const [view, setView] = useState<"upcoming" | "results" | "season">(
    orderedNbaGames(scope, "upcoming", today).length ? "upcoming" : "results",
  );
  const [team, setTeam] = useState(""),
    [day, setDay] = useState(""),
    [limit, setLimit] = useState(12);
  const games = orderedNbaGames(scope, view, today).filter(
    (g) =>
      (!team || g.homeId === Number(team) || g.awayId === Number(team)) &&
      (!day || g.date === day),
  );
  const predictions = (data.models.games?.predictions ?? []) as {
    game_id: string;
    home_win: number;
  }[];
  return (
    <section>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Vista de partidos NBA"
      >
        {(
          [
            ["upcoming", "Próximos"],
            ["results", "Resultados"],
            ["season", "Temporada"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            className={`${button} ${view === id ? "!border-accent !bg-accent-soft !text-accent" : ""}`}
            onClick={() => {
              setView(id);
              setLimit(12);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-5 grid gap-3 rounded-panel border border-border bg-surface-2 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Equipo</span>
          <select
            value={team}
            className={control}
            onChange={(e) => {
              setTeam(e.target.value);
              setLimit(12);
            }}
          >
            <option value="">Todos los equipos</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Fecha NBA</span>
          <input
            type="date"
            className={control}
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setLimit(12);
            }}
          />
        </label>
        <button
          type="button"
          className={`${button} self-end`}
          onClick={() => {
            setTeam("");
            setDay("");
          }}
        >
          Limpiar filtros
        </button>
      </div>
      <p role="status" className="mb-4 text-sm text-muted">
        {games.length} partidos ·{" "}
        {view === "upcoming"
          ? "El siguiente encuentro aparece primero."
          : view === "results"
            ? "Resultados desde el más reciente."
            : "Del primer encuentro al último."}
      </p>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
        {games.slice(0, limit).map((game, index) => {
          const home = data.teams.find((t) => t.id === game.homeId),
            away = data.teams.find((t) => t.id === game.awayId);
          const prediction = predictions.find((p) => p.game_id === game.id);
          return (
            <li key={game.id}>
              <Link
                href={`/nba/${data.season}/partido/${game.id}`}
                className="match-card block h-full rounded-panel border border-border bg-card p-5 transition-colors hover:border-accent hover:bg-accent-soft/20"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="mono text-xs text-subtle">
                    {nbaDate(game.date)}
                  </span>
                  {index === 0 && view === "upcoming" && (
                    <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                      Siguiente
                    </span>
                  )}
                </div>
                {[
                  [away, game.awayPts],
                  [home, game.homePts],
                ].map(([teamObject, points], i) => {
                  const t = teamObject as NbaTeam | undefined;
                  return (
                    <div key={i} className="my-2 flex items-center gap-3">
                      <Badge team={t} />
                      <span className="min-w-0 flex-1 text-sm font-semibold">
                        {t?.name ?? "Equipo pendiente"}
                      </span>
                      <span className="score text-2xl">
                        {points == null ? "—" : String(points)}
                      </span>
                    </div>
                  );
                })}
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
                  {game.status === "finished"
                    ? "Final · Ver estadísticas →"
                    : prediction
                      ? `${nbaFormat(prediction.home_win * 100)}% victoria local estimada · Ver previa →`
                      : "Fecha programada · Ver previa →"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
      {!games.length && (
        <p className="rounded-panel border border-border bg-card p-6 text-muted">
          No hay encuentros disponibles con estos filtros.
        </p>
      )}
      {games.length > limit && (
        <button
          type="button"
          className={`${button} mt-4`}
          onClick={() => setLimit((n) => n + 12)}
        >
          Mostrar más partidos · {games.length - limit} restantes
        </button>
      )}
    </section>
  );
}
