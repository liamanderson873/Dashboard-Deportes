"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type NbaData,
  type NbaPlayer,
  nbaValue,
  nbaLabel,
  foldName,
} from "@/lib/nba";
import { NbaTeamLogo } from "./TeamCrest";
import { NbaScatter } from "./NbaScatter";
import { Picker, button, control } from "./NbaShared";
import { NbaStar } from "./NbaStar";

export function NbaPlayersTable({
  data,
  players,
}: {
  data: NbaData;
  players: NbaPlayer[];
}) {
  const [limit, setLimit] = useState(50);
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Estadísticas de jugadores NBA, medias por partido
        </caption>
        <thead className="bg-surface-2">
          <tr>
            {[
              "Jugador",
              "Equipo",
              "Pos.",
              "PJ",
              "MIN",
              "PTS",
              "REB",
              "AST",
              "TS%",
              "Uso%",
              "Seguir",
            ].map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-3 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.slice(0, limit).map((player) => (
            <tr
              key={player.id}
              className="border-t border-border hover:bg-surface-2/50"
            >
              <th scope="row" className="min-w-44 px-3 py-3">
                <Link
                  className="font-semibold text-accent hover:underline"
                  href={`/nba/${data.season}/jugador/${player.id}`}
                >
                  {player.name}
                </Link>
              </th>
              <td className="px-3 py-3">
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <NbaTeamLogo
                    id={player.teamId}
                    abbreviation={
                      data.teams.find((t) => t.id === player.teamId)
                        ?.abbreviation ?? "VAR"
                    }
                    size={28}
                  />
                  {data.teams.find((t) => t.id === player.teamId)
                    ?.abbreviation ?? "Varios"}
                </span>
              </td>
              <td className="px-3 py-3">{player.position ?? "—"}</td>
              {["gp", "min", "pts", "reb", "ast", "ts_pct", "usg_pct"].map(
                (k) => (
                  <td key={k} className="num whitespace-nowrap px-3 py-3">
                    {nbaValue(player.metrics, k)}
                  </td>
                ),
              )}
              <td className="px-3 py-1">
                <NbaStar id={player.id} name={player.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!players.length && (
        <p role="status" className="p-5 text-muted">
          No hay jugadores con estos filtros.
        </p>
      )}
      {players.length > limit && (
        <button
          type="button"
          className={`${button} m-3`}
          onClick={() => setLimit((n) => n + 50)}
        >
          Mostrar más jugadores · {players.length - limit} restantes
        </button>
      )}
    </div>
  );
}
export function NbaPlayers({
  data,
  initial = {},
}: {
  data: NbaData;
  initial?: Record<string, string>;
}) {
  const [tab, setTab] = useState(
    initial.tab === "compare"
      ? "compare"
      : initial.tab === "chart"
        ? "chart"
        : "explore",
  );
  const [chartVisited, setChartVisited] = useState(initial.tab === "chart");
  const [q, setQ] = useState(initial.q ?? ""),
    [team, setTeam] = useState(initial.team ?? ""),
    [position, setPosition] = useState(initial.pos ?? ""),
    [sort, setSort] = useState(initial.sort ?? "pts");
  const [a, setA] = useState(initial.a ?? ""),
    [b, setB] = useState(initial.b ?? "");
  useEffect(() => {
    if (tab === "chart") return;
    const query = new URLSearchParams({
      tab,
      q,
      team,
      pos: position,
      sort,
      a,
      b,
    });
    window.history.replaceState(
      window.history.state,
      "",
      `/nba/${data.season}/jugadores?${query}`,
    );
  }, [data.season, tab, q, team, position, sort, a, b]);
  const players = data.players
    .filter(
      (p) =>
        foldName(p.name).includes(foldName(q)) &&
        (!team || p.teamId === Number(team)) &&
        (!position || p.position?.includes(position)),
    )
    .toSorted(
      (a, b) =>
        (b.metrics[sort] ?? -Infinity) - (a.metrics[sort] ?? -Infinity) ||
        a.name.localeCompare(b.name),
    );
  const one = data.players.find((p) => p.id === Number(a)),
    two = data.players.find((p) => p.id === Number(b));
  return (
    <>
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Análisis de jugadores NBA"
      >
        {[
          ["explore", "Explorar"],
          ["compare", "Comparar jugadores"],
          ["chart", "Mapa de jugadores"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              if (id === "chart") setChartVisited(true);
            }}
            className={`${button} ${tab === id ? "!border-accent !bg-accent-soft !text-accent" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div hidden={tab !== "chart"}>
        {chartVisited && (
          <NbaScatter data={data} initial={initial} active={tab === "chart"} />
        )}
      </div>
      {tab === "explore" ? (
        <>
          <div className="mb-5 grid gap-3 rounded-panel border border-border bg-surface-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="eyebrow">Buscar jugador</span>
              <input
                type="search"
                className={control}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre o apellido"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <span className="eyebrow">Equipo</span>
              <select
                className={control}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              >
                <option value="">Todos los equipos</option>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="eyebrow">Posición</span>
              <select
                className={control}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="G">Exterior · G</option>
                <option value="F">Alero / ala-pívot · F</option>
                <option value="C">Pívot · C</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="eyebrow">Ordenar por</span>
              <select
                className={control}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {[
                  "pts",
                  "reb",
                  "ast",
                  "stl",
                  "blk",
                  "min",
                  "ts_pct",
                  "usg_pct",
                  "net_rating",
                ].map((k) => (
                  <option key={k} value={k}>
                    {nbaLabel[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p role="status" className="mb-3 text-sm text-muted">
            {players.length} jugadores · Medias por partido; TS% y uso según NBA
            Stats.
          </p>
          <NbaPlayersTable data={data} players={players} />
        </>
      ) : tab === "compare" ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <Picker
              label="Primer jugador"
              data={data}
              value={a}
              onChange={setA}
            />
            <Picker
              label="Segundo jugador"
              data={data}
              value={b}
              onChange={setB}
            />
          </div>
          {!one || !two ? (
            <p className="rounded-panel border border-border bg-card p-6 text-muted">
              Busca dos jugadores por nombre para comparar su rendimiento.
            </p>
          ) : one.id === two.id ? (
            <p role="status">Elige dos jugadores diferentes.</p>
          ) : (
            <div className="rounded-panel border border-border bg-card p-4 sm:p-6">
              <div className="mb-6 grid grid-cols-2 gap-4">
                <h2 className="display text-xl font-bold">{one.name}</h2>
                <h2 className="display text-right text-xl font-bold">
                  {two.name}
                </h2>
              </div>
              {[
                "pts",
                "reb",
                "ast",
                "ts_pct",
                "efg_pct",
                "usg_pct",
                "off_rating",
                "def_rating",
                "net_rating",
              ].map((key) => {
                const max = Math.max(
                  Math.abs(one.metrics[key] ?? 0),
                  Math.abs(two.metrics[key] ?? 0),
                  1,
                );
                return (
                  <div key={key} className="mb-5">
                    <p className="mb-2 text-center text-xs font-semibold text-subtle">
                      {nbaLabel[key]}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {[one, two].map((p, index) => (
                        <div key={p.id}>
                          <span
                            className={`num mb-1 block font-semibold ${index ? "text-right" : ""}`}
                          >
                            {nbaValue(p.metrics, key)}
                          </span>
                          <div
                            className={`flex h-2 overflow-hidden rounded-full bg-surface-2 ${index ? "justify-end" : ""}`}
                          >
                            <span
                              className={`h-full rounded-full ${index ? "bg-ink" : "bg-accent"}`}
                              style={{
                                width: `${(Math.abs(p.metrics[key] ?? 0) / max) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="mt-6 text-xs leading-relaxed text-subtle">
                OffRtg y DefRtg del jugador reflejan la eficiencia del equipo
                mientras está en pista. Un DefRtg menor es mejor; las barras
                indican magnitud, no una nota de calidad. NetRtg puede ser
                negativo.
              </p>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
