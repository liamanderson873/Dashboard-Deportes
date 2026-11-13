"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type NbaData,
  type NbaPlayer,
  type NbaTeam,
  nbaDate,
  nbaFormat,
  nbaValue,
  nbaLabel,
  foldName,
  orderedNbaGames,
  nbaToday,
} from "@/lib/nba";
import {
  assignNbaSlot,
  EMPTY_NBA,
  NBA_PERSONAL_KEY,
  NBA_SLOTS,
  parseNbaPersonal,
  type NbaPersonal,
} from "@/lib/nba-personal";
import { NbaTeamLogo } from "./TeamCrest";
import { PlayerPicker } from "./PlayerPicker";
import { NavIcon } from "./NavIcon";

const change = "marcador-nba-personal-change";
let memory: string | null = null;
let blocked = false;
function snapshot() {
  try {
    return blocked ? memory : localStorage.getItem(NBA_PERSONAL_KEY);
  } catch {
    return memory;
  }
}
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener(change, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(change, fn);
  };
}
function usePersonal() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const state = useMemo(() => parseNbaPersonal(raw), [raw]);
  const [failed, setFailed] = useState(false);
  const update = (fn: (state: NbaPersonal) => NbaPersonal) => {
    memory = JSON.stringify(fn(parseNbaPersonal(snapshot())));
    try {
      localStorage.setItem(NBA_PERSONAL_KEY, memory);
      blocked = false;
      setFailed(false);
    } catch {
      blocked = true;
      setFailed(true);
    }
    window.dispatchEvent(new Event(change));
  };
  return { state, update, failed };
}
const control =
  "min-h-11 min-w-0 max-w-full rounded-control border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-2";
export function NbaStar({
  id,
  name,
  kind = "players",
}: {
  id: number;
  name: string;
  kind?: "players" | "teams";
}) {
  const { state, update, failed } = usePersonal();
  const selected = state[kind].includes(id);
  return (
    <span>
      <button
        type="button"
        className={`${button} min-w-11 ${selected ? "text-accent" : ""}`}
        aria-label={`${selected ? "Dejar de seguir" : "Seguir"} ${name}`}
        aria-pressed={selected}
        onClick={() =>
          update((s) => ({
            ...s,
            [kind]: selected
              ? s[kind].filter((v) => v !== id)
              : [...s[kind], id],
          }))
        }
      >
        <NavIcon name="seguimiento" />
        {selected && <span className="sr-only">Guardado</span>}
      </button>
      {failed && (
        <span role="status" className="block text-xs text-loss">
          No se ha podido guardar en este navegador.
        </span>
      )}
    </span>
  );
}
function Badge({ team }: { team: NbaTeam | undefined }) {
  return <NbaTeamLogo id={team?.id} abbreviation={team?.abbreviation} />;
}

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
function Picker({
  label,
  data,
  value,
  onChange,
  eligible = data.players,
}: {
  label: string;
  data: NbaData;
  value: string;
  onChange: (id: string) => void;
  eligible?: NbaPlayer[];
}) {
  return (
    <PlayerPicker
      label={label}
      value={value}
      onChange={onChange}
      formatPosition={(pos) => pos ?? "Sin posición"}
      players={eligible.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        birth: null,
        nationality: null,
        teamIds: [p.teamId],
      }))}
      teams={data.teams.map((t) => ({ id: t.id, name: t.name, localId: null }))}
    />
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
    initial.tab === "compare" ? "compare" : "explore",
  );
  const [q, setQ] = useState(initial.q ?? ""),
    [team, setTeam] = useState(initial.team ?? ""),
    [position, setPosition] = useState(initial.pos ?? ""),
    [sort, setSort] = useState(initial.sort ?? "pts");
  const [a, setA] = useState(initial.a ?? ""),
    [b, setB] = useState(initial.b ?? "");
  useEffect(() => {
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
        className="mb-5 flex gap-2"
        role="group"
        aria-label="Análisis de jugadores NBA"
      >
        {[
          ["explore", "Explorar"],
          ["compare", "Comparar jugadores"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`${button} ${tab === id ? "!border-accent !bg-accent-soft !text-accent" : ""}`}
          >
            {label}
          </button>
        ))}
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
      ) : (
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
      )}
    </>
  );
}

export function NbaFollowing({ data }: { data: NbaData }) {
  const { state, failed } = usePersonal();
  return (
    <>
      <p className="mb-5 text-sm text-muted">
        Tu selección se guarda en este navegador, sin cuenta. Los favoritos NBA
        son independientes de los de fútbol.
      </p>
      {failed && (
        <p role="status" className="text-loss">
          No se ha podido guardar la selección.
        </p>
      )}
      <details
        className="mb-6 rounded-panel border border-border bg-card p-5"
        open={!state.teams.length}
      >
        <summary className="cursor-pointer font-semibold">
          Gestionar equipos · {state.teams.length} seguidos
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-control border border-border p-3"
            >
              <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                <Badge team={t} />
                {t.name}
              </span>
              <NbaStar id={t.id} name={t.name} kind="teams" />
            </div>
          ))}
        </div>
      </details>
      <h2 className="display mb-4 text-2xl font-bold">Jugadores seguidos</h2>
      <NbaPlayersTable
        data={data}
        players={data.players.filter((p) => state.players.includes(p.id))}
      />
      <h2 className="display mb-4 mt-8 text-2xl font-bold">
        Partidos de tus equipos
      </h2>
      {state.teams.length ? (
        <NbaGameCards data={data} teamIds={state.teams} />
      ) : (
        <p className="text-muted">
          Sigue un equipo para reunir aquí sus próximos partidos.
        </p>
      )}
    </>
  );
}

export function NbaLineup({ data }: { data: NbaData }) {
  const { state, update, failed } = usePersonal();
  const [slot, setSlot] = useState(0);
  const editor = useRef<HTMLHeadingElement>(null);
  const names = [
    "Exterior 1",
    "Exterior 2",
    "Alero / ala-pívot 1",
    "Alero / ala-pívot 2",
    "Pívot",
  ];
  const coords = [
    [25, 76],
    [75, 76],
    [18, 39],
    [82, 39],
    [50, 26],
  ];
  const eligible = data.players.filter(
    (p) =>
      p.position?.includes(NBA_SLOTS[slot]) &&
      (!state.five.includes(p.id) || state.five[slot] === p.id),
  );
  return (
    <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-2xl font-bold">
            Dos exteriores, dos aleros y un pívot
          </h2>
          <span className="mono ml-3 shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
            {state.five.filter(Boolean).length}/5
          </span>
        </div>
        <div className="nba-court relative h-[480px] overflow-hidden rounded-panel border border-border-strong">
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full fill-none stroke-court-line"
            strokeWidth="0.5"
          >
            <rect x="3" y="3" width="94" height="94" />
            <path d="M34 3v36a16 16 0 0 0 32 0V3M12 3v14a38 52 0 0 0 76 0V3M3 94h94" />
            <circle cx="50" cy="11" r="2" />
            <path d="M44 8h12" />
          </svg>
          {state.five.map((id, index) => {
            const p = data.players.find((p) => p.id === id);
            return (
              <button
                type="button"
                key={index}
                aria-label={`${names[index]}: ${p?.name ?? "Plaza libre"}`}
                aria-pressed={slot === index}
                className={`absolute flex min-h-24 w-[27%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-control p-2 text-xs font-semibold ${slot === index ? "bg-card ring-2 ring-accent" : "bg-card/85 hover:bg-card"}`}
                style={{
                  left: `${coords[index][0]}%`,
                  top: `${coords[index][1]}%`,
                }}
                onClick={() => {
                  setSlot(index);
                  if (matchMedia("(max-width:1023px)").matches) {
                    requestAnimationFrame(() => {
                      editor.current?.focus({ preventScroll: true });
                      editor.current?.scrollIntoView({ block: "center" });
                    });
                  }
                }}
              >
                {p ? (
                  <NbaTeamLogo id={p.teamId} size={36} />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-on-ink">
                    +
                  </span>
                )}
                <span className="line-clamp-2 leading-snug">
                  {p?.name ?? names[index]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-panel border border-border bg-card p-5 lg:mt-12">
        <p className="eyebrow mb-2">Mi quinteto ideal</p>
        <h3
          ref={editor}
          tabIndex={-1}
          className="display mb-3 scroll-mt-28 text-2xl font-bold"
        >
          {names[slot]}
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-muted">
          Selecciona una plaza y busca un jugador. Se respetan las posiciones
          del proveedor, incluidos perfiles mixtos G-F o F-C.
        </p>
        <Picker
          label="Buscar jugador para esta plaza"
          data={data}
          eligible={eligible}
          value={String(state.five[slot] ?? "")}
          onChange={(value) =>
            update((s) =>
              assignNbaSlot(
                s,
                slot,
                data.players.find((p) => p.id === Number(value)) ?? null,
              ),
            )
          }
        />
        {state.five[slot] && (
          <button
            className="mt-3 min-h-11 text-sm font-semibold text-loss"
            onClick={() => update((s) => assignNbaSlot(s, slot, null))}
          >
            Quitar jugador
          </button>
        )}
        <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-subtle">
          Se guarda solo en este navegador. La selección no modifica el modelo
          de predicción.
        </p>
        <button
          type="button"
          className={`${button} mt-4`}
          onClick={() => {
            if (confirm("¿Vaciar las cinco plazas?"))
              update((s) => ({ ...s, five: [...EMPTY_NBA.five] }));
          }}
        >
          Vaciar quinteto
        </button>
        {failed && (
          <p role="status" className="mt-3 text-sm text-loss">
            No se pudo guardar en este navegador.
          </p>
        )}
      </div>
    </section>
  );
}
