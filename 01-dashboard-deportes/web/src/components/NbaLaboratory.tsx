"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NbaData } from "@/lib/nba";
import { nbaDate, nbaFormat, nbaProbability, nbaToday } from "@/lib/nba";
import type { BracketMatch, SimResult, SimRow } from "@/lib/nba-simulator";
import type { ForecastRecord } from "@/lib/queries/nba-lab";
import { forecastMetrics } from "@/lib/nba-history";
import { NbaTeamLogo } from "./TeamCrest";
const control =
  "min-h-11 min-w-0 max-w-full rounded-control border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-2 disabled:cursor-wait disabled:opacity-60";
const probability = (p: number) => nbaProbability(p);
export function NbaLaboratory({ data }: { data: NbaData }) {
  const [tab, setTab] = useState("playoffs"),
    [result, setResult] = useState<SimResult | null>(null),
    [baseline, setBaseline] = useState<SimResult | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [team, setTeam] = useState(""),
    [conference, setConference] = useState(""),
    [game, setGame] = useState(""),
    [winner, setWinner] = useState(""),
    [forced, setForced] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<ForecastRecord[]>([]),
    [historyError, setHistoryError] = useState(""),
    [historyFilter, setHistoryFilter] = useState("all"),
    [historyLimit, setHistoryLimit] = useState(150);
  const sequence = useRef(0);
  useEffect(() => {
    const abort = new AbortController();
    const id = ++sequence.current;
    fetch(`/api/nba/${data.season}/simulate`, {
      method: "POST",
      body: JSON.stringify({ forced: {} }),
      headers: { "Content-Type": "application/json" },
      signal: abort.signal,
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw new Error(body.error ?? "No se pudo cargar el simulador.");
        return body as SimResult;
      })
      .then((body) => {
        if (sequence.current === id) {
          setResult(body);
          setBaseline(body);
          setBusy(false);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted && sequence.current === id) {
          setError(e.message);
          setBusy(false);
        }
      });
    fetch(`/api/nba/${data.season}/history`, { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudo cargar el historial.");
        return r.json();
      })
      .then((body) => setHistory(body.records))
      .catch((e) => {
        if (!abort.signal.aborted) setHistoryError(e.message);
      });
    return () => abort.abort();
  }, [data.season]);
  async function recalculate() {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/nba/${data.season}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forced }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No se pudo calcular el escenario.");
      if (sequence.current === id) {
        setResult(body);
        if (!Object.keys(forced).length) setBaseline(body);
      }
    } catch (e) {
      if (sequence.current === id)
        setError(e instanceof Error ? e.message : "No se pudo calcular.");
    } finally {
      if (sequence.current === id) setBusy(false);
    }
  }
  const name = (id: number) =>
      data.teams.find((t) => t.id === id)?.name ?? String(id),
    code = (id: number) =>
      data.teams.find((t) => t.id === id)?.abbreviation ?? "NBA";
  const next = data.games
    .filter(
      (g) =>
        g.status === "scheduled" &&
        g.date >= nbaToday() &&
        (!team || [g.homeId, g.awayId].includes(Number(team))),
    )
    .slice(0, 100);
  const selectedGame = data.games.find((g) => g.id === game),
    isScenario = !!Object.keys(result?.scenario ?? {}).length;
  const dirty =
    JSON.stringify(Object.entries(forced).sort()) !==
    JSON.stringify(Object.entries(result?.scenario ?? {}).sort());
  const rows = (result?.rows ?? [])
    .filter(
      (r) =>
        !conference ||
        data.teams.find((t) => t.id === r.teamId)?.conference === conference,
    )
    .toSorted((a, b) =>
      tab === "cup" ? b.cupChampion - a.cupChampion : b.champion - a.champion,
    );
  const teamRow = result?.rows.find((r) => r.teamId === Number(team)),
    baseTeam = baseline?.rows.find((r) => r.teamId === Number(team));
  const historyRows = history.filter(
    (r) =>
      (!team || [r.homeId, r.awayId].includes(Number(team))) &&
      (historyFilter === "all" ||
        (historyFilter === "resolved"
          ? r.status === "finished"
          : r.status !== "finished")),
  );
  const metrics = forecastMetrics(
    history.filter((r) => !team || [r.homeId, r.awayId].includes(Number(team))),
  );
  return (
    <section aria-label="Laboratorio de simulación NBA" className="mb-8">
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Herramientas del simulador"
      >
        {[
          ["playoffs", "Playoffs"],
          ["cup", "NBA Cup"],
          ["history", "Historial"],
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
      <div className="mb-5 grid gap-3 rounded-panel border border-border bg-surface-2 p-4 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Seguir un equipo</span>
          <select
            className={control}
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setGame("");
              setWinner("");
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
        {tab !== "history" && (
          <label className="flex min-w-0 flex-col gap-2">
            <span className="eyebrow">Conferencia</span>
            <select
              className={control}
              value={conference}
              onChange={(e) => setConference(e.target.value)}
            >
              <option value="">Ambas conferencias</option>
              <option>Este</option>
              <option>Oeste</option>
            </select>
          </label>
        )}
      </div>
      {tab !== "history" && (
        <>
          <details className="mb-5 rounded-panel border border-border bg-card p-4">
            <summary className="min-h-11 font-semibold">
              ¿Qué pasa si…? · {Object.keys(forced).length} resultados
              hipotéticos
            </summary>
            <p className="my-3 text-sm leading-relaxed text-muted">
              Condiciona hasta doce partidos pendientes. Los resultados reales
              quedan fijos. El escenario no modifica el calendario ni el
              historial de predicciones.
            </p>
            <div className="grid items-end gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
              <label className="flex min-w-0 flex-col gap-2">
                <span className="eyebrow">Partido a condicionar</span>
                <select
                  className={control}
                  value={game}
                  onChange={(e) => {
                    setGame(e.target.value);
                    setWinner("");
                  }}
                >
                  <option value="">Selecciona un partido</option>
                  {next.map((g) => (
                    <option key={g.id} value={g.id}>
                      {nbaDate(g.date)} · {code(g.awayId)} @ {code(g.homeId)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-2">
                <span className="eyebrow">Ganador hipotético</span>
                <select
                  className={control}
                  value={winner}
                  disabled={!selectedGame}
                  onChange={(e) => setWinner(e.target.value)}
                >
                  <option value="">Elegir ganador</option>
                  {selectedGame &&
                    [selectedGame.homeId, selectedGame.awayId].map((id) => (
                      <option key={id} value={id}>
                        {name(id)}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className={button}
                disabled={
                  !game ||
                  !winner ||
                  busy ||
                  (!forced[game] && Object.keys(forced).length >= 12)
                }
                onClick={() => setForced({ ...forced, [game]: Number(winner) })}
              >
                Añadir condición
              </button>
            </div>
            <p className="mt-2 text-xs text-subtle">
              Se muestran hasta cien próximos partidos. Filtra por equipo para
              localizar los suyos.
            </p>
            {!!Object.keys(forced).length && (
              <ul className="my-4 space-y-2">
                {Object.entries(forced).map(([id, w]) => {
                  const g = data.games.find((g) => g.id === id)!;
                  return (
                    <li
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-2 px-3 py-2 text-sm"
                    >
                      <span>
                        {nbaDate(g.date)} · {code(g.awayId)} @ {code(g.homeId)}{" "}
                        → gana <strong>{name(w)}</strong>
                      </span>
                      <button
                        className="min-h-11 font-semibold text-loss"
                        type="button"
                        aria-label={`Quitar condición ${code(g.awayId)} contra ${code(g.homeId)}`}
                        onClick={() =>
                          setForced(
                            Object.fromEntries(
                              Object.entries(forced).filter(
                                ([key]) => key !== id,
                              ),
                            ),
                          )
                        }
                      >
                        Quitar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className={`${button} !border-accent !bg-accent !text-white`}
                disabled={busy}
                onClick={recalculate}
              >
                {busy ? "Calculando…" : "Recalcular escenario"}
              </button>
              <button
                type="button"
                className={button}
                disabled={busy || !baseline}
                onClick={() => {
                  setForced({});
                  setResult(baseline);
                  setError("");
                }}
              >
                Restaurar pronóstico original
              </button>
            </div>
          </details>
          <div
            role="status"
            aria-live="polite"
            className="mb-4 text-sm text-muted"
          >
            {busy
              ? "Ejecutando 2.000 temporadas, NBA Cup, play-in y playoffs…"
              : dirty
                ? "Has cambiado condiciones. Recalcula para aplicarlas al cuadro y las probabilidades."
                : isScenario
                  ? "Estás viendo un escenario hipotético condicionado."
                  : "Pronóstico original · sin resultados forzados."}
          </div>
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-panel border border-loss bg-card p-4"
            >
              <p>{error}</p>
              <button
                type="button"
                className={`${button} mt-3`}
                onClick={recalculate}
              >
                Volver a intentar
              </button>
            </div>
          )}
          {result && (
            <>
              <div className="mb-5 rounded-panel border border-border-strong bg-surface-2 p-4 text-sm leading-relaxed">
                <strong>
                  {result.runs.toLocaleString("es-ES")} simulaciones · 82
                  partidos por equipo.
                </strong>{" "}
                Se usan {result.scheduledGames.toLocaleString("es-ES")}{" "}
                encuentros publicados y se generan treinta emparejamientos
                hipotéticos dependientes de NBA Cup. No son fixtures oficiales.
                Fuerza fija al {nbaDate(result.cutoff)}; descanso de los
                encuentros sin fecha: un día. Los márgenes auxiliares y
                desempates por puntos son aproximaciones del modelo, no
                marcadores pronosticados con certeza.
                {result.overtimeIncomplete > 0 && (
                  <p className="mt-2">
                    En {result.overtimeIncomplete} partidos de grupos con
                    prórroga faltan parciales: se anula su diferencia de puntos,
                    pero los puntos anotados de desempate siguen siendo
                    aproximados.
                  </p>
                )}
              </div>
              {teamRow && (
                <div className="mb-5 flex flex-wrap items-center gap-4 rounded-panel border border-accent bg-card p-5">
                  <NbaTeamLogo id={teamRow.teamId} size={52} />
                  <div className="min-w-0">
                    <h2 className="display text-2xl font-bold">
                      {name(teamRow.teamId)}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {tab === "cup" ? "Ganar NBA Cup" : "Ganar el título NBA"}:{" "}
                      <strong className="text-accent">
                        {probability(
                          tab === "cup"
                            ? teamRow.cupChampion
                            : teamRow.champion,
                        )}
                      </strong>
                      {isScenario && baseTeam && (
                        <span>
                          {" "}
                          · cambio:{" "}
                          {nbaFormat(
                            ((tab === "cup"
                              ? teamRow.cupChampion
                              : teamRow.champion) -
                              (tab === "cup"
                                ? baseTeam.cupChampion
                                : baseTeam.champion)) *
                              100,
                            1,
                          )}{" "}
                          puntos porcentuales
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {tab === "cup" && (
                <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {result.cupGroups
                    .filter((g) => !conference || g.name.startsWith(conference))
                    .map((group) => (
                      <div
                        key={group.name}
                        className="rounded-panel border border-border bg-card p-4"
                      >
                        <h3 className="display mb-3 text-xl font-bold">
                          {group.name}
                        </h3>
                        <p className="mb-3 text-xs text-subtle">
                          Grupo actual · probabilidad simulada de pasar a
                          cuartos
                        </p>
                        <table className="w-full text-left text-sm">
                          <caption className="sr-only">
                            Grupo {group.name}
                          </caption>
                          <thead>
                            <tr className="text-subtle">
                              <th className="py-2">Equipo</th>
                              <th>V–D</th>
                              <th className="text-right">Pasar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((r) => (
                              <tr
                                key={r.teamId}
                                className={`border-t border-border ${Number(team) === r.teamId ? "bg-accent-soft" : ""}`}
                              >
                                <th scope="row" className="py-2">
                                  <Link
                                    className="flex min-h-11 items-center gap-2 font-semibold"
                                    href={`/nba/${data.season}/equipo/${r.teamId}`}
                                    title={name(r.teamId)}
                                  >
                                    <NbaTeamLogo id={r.teamId} size={28} />
                                    {code(r.teamId)}
                                  </Link>
                                </th>
                                <td className="num">
                                  {r.wins}–{r.played - r.wins}
                                </td>
                                <td className="num text-right">
                                  {probability(
                                    result.rows.find(
                                      (t) => t.teamId === r.teamId,
                                    )?.cupQualify ?? 0,
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              )}
              <h2 className="display mb-3 text-2xl font-bold">
                {tab === "cup"
                  ? "Opciones en NBA Cup"
                  : "Opciones de playoffs y título"}
              </h2>
              <p className="mb-3 text-xs text-subtle">
                Probabilidades sobre todas las simulaciones. El error Monte
                Carlo no representa toda la incertidumbre del modelo.
              </p>
              <div className="mb-7 overflow-x-auto rounded-panel border border-border bg-card">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Probabilidades {tab === "cup" ? "NBA Cup" : "playoffs"}
                  </caption>
                  <thead className="bg-surface-2">
                    <tr>
                      {(tab === "cup"
                        ? ["Equipo", "Cuartos", "Semifinal", "Final", "Campeón"]
                        : [
                            "Equipo",
                            "Victorias · 90%",
                            "Directo",
                            "Play-in",
                            "Playoffs",
                            "2.ª ronda",
                            "Final conf.",
                            "Final NBA",
                            "Campeón",
                          ]
                      ).map((label) => (
                        <th key={label} className="whitespace-nowrap px-3 py-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.teamId}
                        className={`border-t border-border ${Number(team) === row.teamId ? "bg-accent-soft" : "hover:bg-surface-2/50"}`}
                      >
                        <th scope="row" className="min-w-52 px-3 py-2">
                          <Link
                            className="flex min-h-11 items-center gap-3 font-semibold hover:text-accent"
                            href={`/nba/${data.season}/equipo/${row.teamId}`}
                          >
                            <NbaTeamLogo id={row.teamId} size={32} />
                            {name(row.teamId)}
                          </Link>
                        </th>
                        {tab !== "cup" && (
                          <td className="num whitespace-nowrap p-3">
                            {nbaFormat(row.wins)}{" "}
                            <span className="text-xs text-subtle">
                              ({row.low}–{row.high})
                            </span>
                          </td>
                        )}
                        {(tab === "cup"
                          ? [
                              "cupQualify",
                              "cupSemifinal",
                              "cupFinal",
                              "cupChampion",
                            ]
                          : [
                              "direct",
                              "playin",
                              "playoffs",
                              "round2",
                              "conferenceFinal",
                              "final",
                              "champion",
                            ]
                        ).map((key) => (
                          <td key={key} className="num whitespace-nowrap p-3">
                            {probability(row[key as keyof SimRow])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details className="mb-5 rounded-panel border border-border bg-card p-4">
                <summary className="min-h-11 font-semibold">
                  Evaluación del modelo auxiliar de margen
                </summary>
                <p className="mt-3 text-sm text-muted">
                  Prueba reservada 2025-26: {result.marginReport.n} partidos.
                  MAE {nbaFormat(result.marginReport.mae, 2)} puntos; referencia
                  constante {nbaFormat(result.marginReport.baseline_mae, 2)};
                  RMSE {nbaFormat(result.marginReport.rmse, 2)}. El ajuste final
                  utiliza diez temporadas completas. Estos errores no validan
                  por sí solos los desempates ni la calibración de los
                  intervalos de temporada.
                </p>
              </details>
              <Bracket
                matches={
                  tab === "cup" ? result.cupBracket : result.playoffBracket
                }
                data={data}
                selected={Number(team)}
                conference={conference}
              />
              <details className="mt-5 rounded-panel border border-border bg-card p-4">
                <summary className="min-h-11 font-semibold">
                  Ver los treinta emparejamientos hipotéticos del ejemplo
                </summary>
                <p className="my-3 text-sm text-muted">
                  Cambian entre simulaciones según quién avance en NBA Cup. La
                  final de Copa no cuenta para las 82 jornadas.
                </p>
                <ul className="grid gap-2 text-sm md:grid-cols-2">
                  {result.syntheticGames.map((g, i) => (
                    <li key={i} className="rounded-control bg-surface-2 p-3">
                      {code(g.awayId)} @ {code(g.homeId)} · {g.stage}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </>
      )}
      {tab === "history" && (
        <>
          <h2 className="display mb-3 text-2xl font-bold">
            Predicciones guardadas antes del partido
          </h2>
          <p className="mb-4 max-w-4xl text-sm leading-relaxed text-muted">
            Se conserva cada versión al publicar el modelo. Aquí se evalúa la
            última predicción previa de cada encuentro. Como no tenemos hora de
            inicio, solo admitimos las guardadas en un día NBA anterior al
            partido. No hay resultados históricos reconstruidos a posteriori; la
            evaluación real se irá llenando cuando se jueguen los encuentros
            registrados.
          </p>
          {historyError && <p role="alert">{historyError}</p>}
          {metrics ? (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Partidos resueltos", String(metrics.n)],
                  ["Brier ↓", nbaFormat(metrics.brier, 4)],
                  ["Log loss ↓", nbaFormat(metrics.logLoss, 4)],
                ].map(([label, value]) => (
                  <div key={label} className="stat-card bg-card p-5">
                    <p className="eyebrow">{label}</p>
                    <p className="score mt-3 text-3xl">{value}</p>
                  </div>
                ))}
              </div>
              <details className="mb-5 rounded-panel border border-border bg-card p-4">
                <summary className="font-semibold">
                  Fiabilidad observada por intervalo
                </summary>
                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-2">Prob. media</th>
                      <th>Victoria local real</th>
                      <th>Partidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.bins.map((b) => (
                      <tr key={b.from} className="border-t border-border">
                        <td className="py-2">{probability(b.predicted)}</td>
                        <td>{probability(b.observed)}</td>
                        <td>{b.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-subtle">
                  Pocos partidos por intervalo producen estimaciones inestables.
                </p>
              </details>
            </>
          ) : (
            <p className="mb-5 rounded-panel border border-border bg-card p-5 text-muted">
              Todavía no hay partidos resueltos con una predicción previa válida
              {team ? " para este equipo" : ""}. No se muestran métricas vacías
              como si fueran cero.
            </p>
          )}
          <label className="mb-4 flex max-w-xs flex-col gap-2">
            <span className="eyebrow">Mostrar encuentros</span>
            <select
              className={control}
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
            >
              <option value="all">Todos los registrados</option>
              <option value="resolved">Resueltos</option>
              <option value="pending">Pendientes</option>
            </select>
          </label>
          <p role="status" className="mb-3 text-sm text-subtle">
            {historyRows.length} pronósticos · corte, emisión y versión
            disponibles por fila
          </p>
          <div className="overflow-x-auto rounded-panel border border-border bg-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Historial prospectivo de predicciones
              </caption>
              <thead className="bg-surface-2">
                <tr>
                  {[
                    "Fecha / partido",
                    "Victoria local",
                    "Resultado",
                    "Emisión / corte",
                    "Versión",
                  ].map((h) => (
                    <th className="whitespace-nowrap p-3" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.slice(0, historyLimit).map((r) => (
                  <tr className="border-t border-border" key={r.gameId}>
                    <th scope="row" className="min-w-52 p-3">
                      <Link
                        className="text-accent hover:underline"
                        href={`/nba/${data.season}/partido/${r.gameId}`}
                      >
                        {code(r.awayId)} @ {code(r.homeId)}
                      </Link>
                      <span className="mt-1 block text-xs font-normal text-subtle">
                        {nbaDate(r.date)}
                      </span>
                    </th>
                    <td className="num p-3">{probability(r.probability)}</td>
                    <td className="num whitespace-nowrap p-3">
                      {r.status === "finished"
                        ? `${r.awayPts}–${r.homePts}`
                        : "Pendiente"}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      {new Date(r.created).toLocaleString("es-ES")}
                      <span className="block text-subtle">
                        Datos: {nbaDate(r.cutoff)}
                      </span>
                    </td>
                    <td className="mono p-3 text-xs" title={r.modelVersion}>
                      {r.modelVersion.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!historyRows.length && (
              <p className="p-5 text-muted">
                No hay pronósticos con este filtro.
              </p>
            )}
          </div>
          {historyRows.length > historyLimit && (
            <button
              type="button"
              className={`${button} mt-4`}
              onClick={() => setHistoryLimit((n) => n + 150)}
            >
              Mostrar más pronósticos · {historyRows.length - historyLimit}{" "}
              restantes
            </button>
          )}
        </>
      )}
    </section>
  );
}
function Bracket({
  matches,
  data,
  selected,
  conference,
}: {
  matches: BracketMatch[];
  data: NbaData;
  selected: number;
  conference: string;
}) {
  const name = (id: number) =>
    data.teams.find((t) => t.id === id)?.name ?? String(id);
  const confs = [...new Set(matches.map((m) => m.conference))].filter(
    (c) => !conference || c === conference || c === "NBA",
  );
  return (
    <section aria-label="Cuadro de un recorrido simulado">
      <h2 className="display mb-3 text-2xl font-bold">
        Un recorrido posible, ronda a ronda
      </h2>
      <p className="mb-5 max-w-4xl text-sm leading-relaxed text-muted">
        Es la primera ejecución de la semilla 42, no un cuadro oficial ni la
        combinación de favoritos. Las probabilidades de cada cruce están
        condicionadas a que esos dos equipos se enfrenten; las de la tabla
        anterior resumen todas las ejecuciones.
      </p>
      {confs.map((conf) => (
        <div key={conf} className="mb-7">
          <h3 className="display mb-3 text-xl font-bold">
            {conf === "NBA" ? "Final por el título" : `Conferencia ${conf}`}
          </h3>
          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ...new Set(
                matches
                  .filter((m) => m.conference === conf)
                  .map((m) => m.stage),
              ),
            ].map((stage) => (
              <div key={stage}>
                <h4 className="eyebrow mb-3">{stage}</h4>
                <ul className="space-y-3">
                  {matches
                    .filter((m) => m.conference === conf && m.stage === stage)
                    .map((m, i) => (
                      <li
                        key={i}
                        className={`rounded-panel border bg-card p-3 ${[m.homeId, m.awayId].includes(selected) ? "border-accent ring-1 ring-accent" : "border-border"}`}
                      >
                        {[m.homeId, m.awayId].map((id, index) => (
                          <Link
                            key={id}
                            href={`/nba/${data.season}/equipo/${id}`}
                            className="my-1 flex min-h-11 items-center gap-2 text-sm hover:text-accent"
                          >
                            <NbaTeamLogo id={id} size={30} />
                            <span
                              className={`min-w-0 flex-1 ${m.winner === id ? "font-bold" : ""}`}
                            >
                              {name(id)}
                            </span>
                            <span className="num text-xs">
                              {index === 0
                                ? (m.homeWins ?? probability(m.probability))
                                : (m.awayWins ??
                                  probability(1 - m.probability))}
                            </span>
                          </Link>
                        ))}
                        <p className="mt-2 border-t border-border pt-2 text-xs text-subtle">
                          Avanza:{" "}
                          {
                            data.teams.find((t) => t.id === m.winner)
                              ?.abbreviation
                          }
                          {m.homeWins !== undefined
                            ? ` · P(serie local): ${probability(m.probability)}`
                            : ""}
                        </p>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
