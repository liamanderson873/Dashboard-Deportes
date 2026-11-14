"use client";

import { useEffect, useMemo, useState } from "react";
import {
  aggregatePlayers,
  ageAt,
  metricKeys,
  metricValue,
  type Metric,
  type PlayerData,
} from "@/lib/player-analytics";
import { pe } from "@/lib/players-es";
import { togglePersonal } from "@/lib/personal-state";
import { FootballTeamLogo } from "./TeamCrest";
import { PlayerPicker } from "./PlayerPicker";
import { searchPlayers } from "@/lib/player-browsing";
import { LineupPitch } from "./LineupPitch";
import { MatchCards } from "./UpcomingMatchCards";
import { Empty, Field, button, control, usePersonal } from "./PlayerShared";
import { Coverage } from "./TeamPlayerStats";
import { PlayerTable } from "./PlayerTable";
import { Comparison } from "./PlayerProfile";

export { PlayerStar, TeamFollow } from "./PlayerFollow";
export { TeamPlayerStats, Coverage } from "./TeamPlayerStats";
export { PlayerProfile } from "./PlayerProfile";

export function PlayerWorkbench({
  data,
  base,
  today,
  now,
  initial = {},
  surface = "players",
}: {
  data: PlayerData;
  base: string;
  today: string;
  now: string;
  initial?: Record<string, string>;
  surface?: "players" | "following" | "lineup";
}) {
  const [tab, setTab] = useState(
    surface === "following"
      ? "favoritos"
      : surface === "lineup"
        ? "once"
        : initial.tab === "comparar"
          ? "comparar"
          : "explorar",
  );
  const [query, setQuery] = useState(initial.q ?? ""),
    [team, setTeam] = useState(initial.team ?? ""),
    [position, setPosition] = useState(initial.pos ?? "");
  const [minimum, setMinimum] = useState(initial.min ?? "180"),
    [maxAge, setMaxAge] = useState(initial.age ?? ""),
    [sort, setSort] = useState<Metric | "minutes">(
      Object.hasOwn(pe.metrics, initial.sort ?? "")
        ? (initial.sort as Metric)
        : "minutes",
    );
  const [period, setPeriod] = useState<"season" | "five">(
      initial.period === "five" ? "five" : "season",
    ),
    [per90, setPer90] = useState(initial.mode === "90");
  const [a, setA] = useState(initial.a ?? ""),
    [b, setB] = useState(initial.b ?? "");
  const { state, update, failed } = usePersonal();
  const min = Math.max(0, Number(minimum) || 0);
  const rows = useMemo(
    () =>
      aggregatePlayers(
        data.players,
        data.appearances,
        period,
        Number(team) || undefined,
      ),
    [data, period, team],
  );
  const filtered = rows
    .filter(
      (r) =>
        searchPlayers([r.player], query).length > 0 &&
        (!position || r.player.position === position) &&
        (!team ||
          r.player.teamIds.includes(Number(team)) ||
          r.teamIds.includes(Number(team))) &&
        r.minutes >= min &&
        (!maxAge ||
          (ageAt(r.player.birth, today) !== null &&
            ageAt(r.player.birth, today)! <= Number(maxAge))),
    )
    .sort((a, b) => {
      const av = sort === "minutes" ? a.minutes : metricValue(a, sort, per90),
        bv = sort === "minutes" ? b.minutes : metricValue(b, sort, per90);
      return av === null
        ? bv === null
          ? a.player.id - b.player.id
          : 1
        : bv === null
          ? -1
          : bv - av || a.player.name.localeCompare(b.player.name);
    });
  useEffect(() => {
    if (surface !== "players") return;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({
      tab,
      q: query,
      team,
      pos: position,
      min: minimum,
      age: maxAge,
      sort,
      period,
      mode: per90 ? "90" : "total",
      a,
      b,
    })) {
      if (v) p.set(k, v);
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${base}/jugadores?${p}`,
    );
  }, [
    base,
    tab,
    query,
    team,
    position,
    minimum,
    maxAge,
    sort,
    period,
    per90,
    a,
    b,
    surface,
  ]);
  const star = (id: number) => update((s) => togglePersonal(s, "players", id));
  const one = rows.find((r) => r.player.id === Number(a)),
    two = rows.find((r) => r.player.id === Number(b));
  return (
    <>
      <Coverage data={data} />
      {surface === "players" && (
        <nav aria-label={pe.title} className="scroll-row mb-6 flex gap-2">
          {Object.entries(pe.tabs)
            .filter(([id]) => id === "explorar" || id === "comparar")
            .map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`${button} shrink-0 ${tab === id ? "!border-accent !bg-accent-soft !text-accent" : ""}`}
              >
                {label}
              </button>
            ))}
        </nav>
      )}
      {failed && (
        <p role="status" className="mb-4 text-loss">
          {pe.storageError}
        </p>
      )}
      {(tab === "explorar" || tab === "comparar") && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-panel border border-border bg-surface-2 p-4 md:grid-cols-4">
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
            <Field label={pe.minMinutes}>
              <input
                className={control}
                type="number"
                min="0"
                max="10000"
                step="30"
                value={minimum}
                onChange={(e) => setMinimum(e.target.value)}
              />
            </Field>
            <Field label={pe.team}>
              <select
                className={control}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              >
                <option value="">{pe.all}</option>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mb-5 max-w-4xl text-xs leading-relaxed text-subtle">
            {pe.formula}
          </p>
          {per90 && min < (period === "five" ? 90 : 180) && (
            <p role="status" className="mb-4 text-sm text-loss">
              {pe.smallSample}
            </p>
          )}
        </>
      )}
      {!data.players.length &&
      tab !== "once" &&
      tab !== "favoritos" &&
      tab !== "partidos" ? (
        <Empty />
      ) : null}
      {tab === "explorar" && (
        <>
          <div className="mb-5 grid grid-cols-2 items-end gap-3 md:grid-cols-5">
            <Field label={pe.search}>
              <input
                className={control}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Field>
            <Field label={pe.position}>
              <select
                className={control}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="">{pe.all}</option>
                {Object.entries(pe.positions).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={pe.maxAge}>
              <input
                className={control}
                type="number"
                min="15"
                max="60"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
              />
            </Field>
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
            <button
              className={button}
              onClick={() => {
                setQuery("");
                setTeam("");
                setPosition("");
                setMinimum("180");
                setMaxAge("");
                setSort("minutes");
                setPeriod("season");
                setPer90(false);
              }}
            >
              {pe.reset}
            </button>
          </div>
          <p role="status" className="mb-3 text-sm text-muted">
            {filtered.length} jugadores · {data.players.length} en el catálogo ·{" "}
            {pe.age}: {today}
          </p>
          <PlayerTable
            rows={filtered}
            base={base}
            teams={data.teams}
            per90={per90}
            extraMetric={sort === "minutes" ? undefined : sort}
            starred={state.players}
            onStar={star}
          />
        </>
      )}
      {tab === "comparar" && (
        <>
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <PlayerPicker
              label={pe.compareA}
              players={data.players}
              teams={data.teams}
              value={a}
              onChange={setA}
            />
            <PlayerPicker
              label={pe.compareB}
              players={data.players}
              teams={data.teams}
              value={b}
              onChange={setB}
            />
          </div>
          {!one || !two ? (
            <p className="p-5 text-muted">{pe.compareHint}</p>
          ) : a === b ? (
            <p role="status">{pe.samePlayer}</p>
          ) : (
            <Comparison
              one={one}
              two={two}
              per90={per90}
              cohort={rows}
              minimum={Math.max(min, period === "five" ? 90 : 180)}
            />
          )}
        </>
      )}
      {tab === "favoritos" && (
        <>
          <h2 className="display mb-3 text-2xl font-bold">
            {pe.favoriteTeams}
          </h2>
          <p className="mb-4 text-sm text-muted">
            Sigue tus equipos para reunir aquí sus próximos encuentros.
          </p>
          <details
            className="mb-6 rounded-panel border border-border bg-card p-4"
            open={state.teams.length === 0}
          >
            <summary className="min-h-8 cursor-pointer font-semibold">
              Gestionar equipos ·{" "}
              {data.teams.filter((t) => state.teams.includes(t.id)).length}{" "}
              seguidos en esta liga
            </summary>
            <div className="mb-8 flex flex-wrap gap-2">
              {data.teams.map((t) => (
                <button
                  key={t.id}
                  className={`${button} ${state.teams.includes(t.id) ? "!border-accent !text-accent" : ""}`}
                  aria-pressed={state.teams.includes(t.id)}
                  onClick={() =>
                    update((s) => togglePersonal(s, "teams", t.id))
                  }
                >
                  <span className="mr-2">
                    <FootballTeamLogo id={t.localId} name={t.name} />
                  </span>
                  {state.teams.includes(t.id) ? "★" : "☆"} {t.name}
                </button>
              ))}
            </div>
          </details>
          <h2 className="display mb-3 text-2xl font-bold">{pe.favorites}</h2>
          <p className="mb-3 text-sm text-subtle">
            {pe.savedLocal} Se muestran los jugadores de esta liga.
          </p>
          {state.players.length === 0 ? (
            <p className="p-4">{pe.noFavorites}</p>
          ) : (
            <PlayerTable
              rows={rows.filter((r) => state.players.includes(r.player.id))}
              base={base}
              teams={data.teams}
              per90={false}
              starred={state.players}
              onStar={star}
            />
          )}
          {state.teams.length > 0 && (
            <MatchCards
              data={{
                ...data,
                matches: data.matches.filter(
                  (m) =>
                    state.teams.includes(m.homeId) ||
                    state.teams.includes(m.awayId),
                ),
              }}
              base={base}
              now={now}
            />
          )}
        </>
      )}
      {tab === "once" && (
        <LineupPitch data={data} state={state} update={update} />
      )}
    </>
  );
}
