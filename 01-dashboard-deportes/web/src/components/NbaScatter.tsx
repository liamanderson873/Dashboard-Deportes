"use client";
import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { type NbaData, nbaFormat } from "@/lib/nba";
import {
  scatterMetrics,
  isScatterMetric,
  scatterCohort,
  sortScatter,
  parseScatterRules,
  serializeScatterRules,
  type ScatterMetric,
  type ScatterRule,
  type ScatterPoint,
} from "@/lib/nba-scatter";
import { numericAxis } from "@/lib/nba-visuals";
import { PlayerPicker } from "./PlayerPicker";
import { NbaTeamLogo } from "./TeamCrest";
import { usePlotWidth } from "./usePlotWidth";
const control =
  "min-h-11 min-w-0 max-w-full rounded-control border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-50";
const clamp = (value: string, max: number, fallback: number) =>
  value.trim() !== "" && Number.isFinite(Number(value))
    ? Math.max(0, Math.min(max, Number(value)))
    : fallback;
export function NbaScatter({
  data,
  initial = {},
  active,
}: {
  data: NbaData;
  initial?: Record<string, string>;
  active: boolean;
}) {
  const [x, setX] = useState<ScatterMetric>(
      isScatterMetric(initial.x) ? initial.x : "pts",
    ),
    [y, setY] = useState<ScatterMetric>(
      isScatterMetric(initial.y) ? initial.y : "ts_pct",
    );
  const [minGames, setMinGames] = useState(
      String(clamp(initial.gp ?? "5", 100, 5)),
    ),
    [minMinutes, setMinMinutes] = useState(
      String(clamp(initial.minutes ?? "15", 70, 15)),
    ),
    [team, setTeam] = useState(initial.cteam ?? ""),
    [position, setPosition] = useState(initial.cpos ?? "");
  const [rules, setRules] = useState<ScatterRule[]>(() =>
    parseScatterRules(initial.rules ?? ""),
  );
  const [ruleMetric, setRuleMetric] = useState<ScatterMetric>("pts"),
    [operator, setOperator] = useState<"gte" | "lte">("gte"),
    [ruleValue, setRuleValue] = useState("");
  const [selected, setSelected] = useState(initial.selected ?? ""),
    [hovered, setHovered] = useState<number | null>(null),
    [scale, setScale] = useState(initial.scale === "fit" ? "fit" : "zero"),
    [order, setOrder] = useState<"x" | "y">("y"),
    [limit, setLimit] = useState(50);
  const { ref, width } = usePlotWidth(active),
    id = useId();
  const cohort = useMemo(
    () =>
      scatterCohort(data.players, x, y, {
        team,
        position,
        minGames: clamp(minGames, 100, 0),
        minMinutes: clamp(minMinutes, 70, 0),
        rules,
      }),
    [data.players, x, y, team, position, minGames, minMinutes, rules],
  );
  const rows = useMemo(
    () => sortScatter(cohort.points, order, order === "x" ? x : y),
    [cohort.points, order, x, y],
  );
  const xAxis = numericAxis(
      cohort.points.map((p) => p.x),
      scale === "zero",
    ),
    yAxis = numericAxis(
      cohort.points.map((p) => p.y),
      scale === "zero",
    );
  const height = width < 600 ? 360 : 420,
    left = 58,
    right = 20,
    top = 26,
    bottom = 60,
    pw = width - left - right,
    ph = height - top - bottom;
  const sx = (value: number) => left + ((value - xAxis.min) / xAxis.span) * pw,
    sy = (value: number) =>
      height - bottom - ((value - yAxis.min) / yAxis.span) * ph;
  const points = cohort.points.toSorted(
    (a, b) => a.x - b.x || a.y - b.y || a.player.id - b.player.id,
  );
  const hoveredPoint = points.find((p) => p.player.id === hovered),
    pinned = points.find((p) => String(p.player.id) === selected),
    detail = hoveredPoint ?? pinned;
  const meanX = points.length
      ? points.reduce((n, p) => n + p.x, 0) / points.length
      : null,
    meanY = points.length
      ? points.reduce((n, p) => n + p.y, 0) / points.length
      : null;
  const leaderX = sortScatter(points, "x", x)[0],
    leaderY = sortScatter(points, "y", y)[0],
    metricOptions = Object.entries(scatterMetrics) as [
      ScatterMetric,
      (typeof scatterMetrics)[ScatterMetric],
    ][];
  const format = (value: number, metric: ScatterMetric) =>
    `${nbaFormat(value, 1)}${scatterMetrics[metric].percent ? "%" : ""}`;
  useEffect(() => {
    if (!active) return;
    const query = new URLSearchParams({
      tab: "chart",
      x,
      y,
      gp: String(clamp(minGames, 100, 0)),
      minutes: String(clamp(minMinutes, 70, 0)),
      cteam: team,
      cpos: position,
      scale,
      rules: serializeScatterRules(rules),
      selected,
    });
    window.history.replaceState(
      window.history.state,
      "",
      `/nba/${data.season}/jugadores?${query}`,
    );
  }, [
    active,
    data.season,
    x,
    y,
    minGames,
    minMinutes,
    team,
    position,
    scale,
    rules,
    selected,
  ]);
  function reset() {
    setMinGames("5");
    setMinMinutes("15");
    setTeam("");
    setPosition("");
    setRules([]);
    setHovered(null);
    setLimit(50);
  }
  function nearest(
    event: PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect(),
      mx = ((event.clientX - rect.left) * width) / rect.width,
      my = ((event.clientY - rect.top) * height) / rect.height;
    let best: ScatterPoint | undefined,
      distance = 20 ** 2;
    for (const p of points) {
      const d = (mx - sx(p.x)) ** 2 + (my - sy(p.y)) ** 2;
      if (d < distance) {
        distance = d;
        best = p;
      }
    }
    return best;
  }
  function onKeys(event: KeyboardEvent<SVGSVGElement>) {
    if (!points.length) return;
    const current = points.findIndex(
      (p) => p.player.id === (hovered ?? Number(selected)),
    );
    let index = current < 0 ? 0 : current;
    if (["ArrowRight", "ArrowDown"].includes(event.key))
      index = Math.min(points.length - 1, index + 1);
    else if (["ArrowLeft", "ArrowUp"].includes(event.key))
      index = Math.max(0, index - 1);
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = points.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(String(points[index].player.id));
      return;
    } else if (event.key === "Escape") {
      setHovered(null);
      return;
    } else return;
    event.preventDefault();
    setHovered(points[index].player.id);
  }
  const activePoint = hoveredPoint ?? pinned;
  return (
    <section aria-label="Mapa estadístico de jugadores NBA">
      <h2 className="display mb-2 text-2xl font-bold">
        Un punto, un jugador. Dos estadísticas para comparar.
      </h2>
      <p className="mb-5 max-w-4xl text-sm leading-relaxed text-muted">
        Cruza volumen, eficiencia y otras cifras de toda la NBA. Las condiciones
        se aplican a la muestra completa; los jugadores sin datos en alguno de
        los ejes quedan fuera del gráfico.
      </p>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Comparativas preparadas"
      >
        {[
          ["pts", "ts_pct", "Anotación y eficiencia"],
          ["ast", "tov", "Asistencias y pérdidas"],
          ["usg_pct", "ts_pct", "Uso y eficiencia"],
          ["min", "reb", "Minutos y rebotes"],
        ].map(([a, b, label]) => (
          <button
            key={label}
            type="button"
            className={button}
            onClick={() => {
              setX(a as ScatterMetric);
              setY(b as ScatterMetric);
              setHovered(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 rounded-panel border border-border bg-surface-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Eje horizontal · X</span>
          <select
            className={control}
            value={x}
            onChange={(e) => {
              setX(e.target.value as ScatterMetric);
              setHovered(null);
            }}
          >
            {metricOptions.map(([key, m]) => (
              <option key={key} value={key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Eje vertical · Y</span>
          <select
            className={control}
            value={y}
            onChange={(e) => {
              setY(e.target.value as ScatterMetric);
              setHovered(null);
            }}
          >
            {metricOptions.map(([key, m]) => (
              <option key={key} value={key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Escala de los ejes</span>
          <select
            className={control}
            value={scale}
            onChange={(e) => setScale(e.target.value)}
          >
            <option value="zero">Incluir el cero</option>
            <option value="fit">Ajustar a la muestra</option>
          </select>
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
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Posición</span>
          <select
            className={control}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            <option value="">Todas las posiciones</option>
            <option value="G">Exterior · G</option>
            <option value="F">Alero / ala-pívot · F</option>
            <option value="C">Pívot · C</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="eyebrow">Mín. partidos</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className={control}
              value={minGames}
              onChange={(e) => setMinGames(e.target.value)}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="eyebrow">Mín. min/PJ</span>
            <input
              type="number"
              min="0"
              max="70"
              step="1"
              className={control}
              value={minMinutes}
              onChange={(e) => setMinMinutes(e.target.value)}
            />
          </label>
        </div>
      </div>
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
              setRules([
                ...rules,
                { metric: ruleMetric, operator, value: Number(ruleValue) },
              ]);
              setRuleValue("");
              setLimit(50);
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
                {r.operator === "gte" ? "≥" : "≤"} {format(r.value, r.metric)}
              </span>
              <button
                type="button"
                className="min-h-11 min-w-11 px-2 font-semibold"
                aria-label={`Quitar condición ${scatterMetrics[r.metric].short} ${r.operator === "gte" ? "mayor o igual" : "menor o igual"} ${r.value}`}
                onClick={() =>
                  setRules(rules.filter((_, index) => index !== i))
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          <strong>{points.length}</strong> jugadores representados de{" "}
          {data.players.length} perfiles · {cohort.missing} sin ambos ejes entre
          quienes cumplen los filtros.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={reset}>
            Restablecer filtros
          </button>
          <button
            type="button"
            className={button}
            onClick={() => {
              setMinGames("0");
              setMinMinutes("0");
              setTeam("");
              setPosition("");
              setRules([]);
            }}
          >
            Todos con datos
          </button>
        </div>
      </div>
      {x === y && (
        <p className="mb-4 rounded-control bg-accent-soft p-4 text-sm text-accent">
          Has elegido la misma estadística en ambos ejes. Cambia una para
          comparar dos dimensiones distintas.
        </p>
      )}
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
                {p ? format(key === x ? p.x : p.y, key as ScatterMetric) : "—"}
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
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 rounded-panel border border-border bg-card p-3 sm:p-4">
          <div ref={ref} className="min-w-0">
            {!!points.length ? (
              <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                height={height}
                role="listbox"
                tabIndex={0}
                aria-label={`Mapa de ${points.length} jugadores: ${scatterMetrics[x].label} frente a ${scatterMetrics[y].label}. Usa las flechas para recorrer jugadores y Enter para seleccionar.`}
                aria-activedescendant={
                  activePoint ? `${id}-${activePoint.player.id}` : undefined
                }
                onKeyDown={onKeys}
                onFocus={() => {
                  if (!activePoint && points[0])
                    setHovered(points[0].player.id);
                }}
                onPointerMove={(event) =>
                  setHovered(nearest(event)?.player.id ?? null)
                }
                onPointerLeave={() => setHovered(null)}
                onClick={(event) => {
                  const p = nearest(event);
                  if (p) setSelected(String(p.player.id));
                }}
                style={{ touchAction: "pan-y" }}
              >
                <g aria-hidden="true">
                  {xAxis.ticks.map((v) => (
                    <g key={`x${v}`}>
                      <path
                        d={`M${sx(v)} ${top}V${height - bottom}`}
                        stroke="var(--border)"
                        strokeDasharray="2 4"
                      />
                      <text
                        x={sx(v)}
                        y={height - bottom + 23}
                        textAnchor="middle"
                        fontSize="12"
                        fill="var(--muted)"
                        className="num"
                      >
                        {nbaFormat(v, xAxis.step < 1 ? 2 : 0)}
                      </text>
                    </g>
                  ))}
                  {yAxis.ticks.map((v) => (
                    <g key={`y${v}`}>
                      <path
                        d={`M${left} ${sy(v)}H${width - right}`}
                        stroke="var(--border)"
                        strokeDasharray="2 4"
                      />
                      <text
                        x={left - 10}
                        y={sy(v) + 4}
                        textAnchor="end"
                        fontSize="12"
                        fill="var(--muted)"
                        className="num"
                      >
                        {nbaFormat(v, yAxis.step < 1 ? 2 : 0)}
                      </text>
                    </g>
                  ))}
                  <path
                    d={`M${left} ${top}V${height - bottom}H${width - right}`}
                    fill="none"
                    stroke="var(--border-strong)"
                  />
                  {meanX !== null && (
                    <path
                      d={`M${sx(meanX)} ${top}V${height - bottom}`}
                      stroke="var(--subtle)"
                      strokeDasharray="6 5"
                    />
                  )}
                  {meanY !== null && (
                    <path
                      d={`M${left} ${sy(meanY)}H${width - right}`}
                      stroke="var(--subtle)"
                      strokeDasharray="6 5"
                    />
                  )}
                  <text
                    x={left}
                    y="15"
                    fontSize="12"
                    fontWeight="600"
                    fill="var(--fg)"
                  >
                    {scatterMetrics[y].short} · {scatterMetrics[y].unit}
                  </text>
                  <text
                    x={left + pw / 2}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="var(--fg)"
                  >
                    {scatterMetrics[x].short} · {scatterMetrics[x].unit}
                  </text>
                </g>
                {points.map((p) => (
                  <g
                    key={p.player.id}
                    id={`${id}-${p.player.id}`}
                    role="option"
                    aria-selected={String(p.player.id) === selected}
                    aria-label={`${p.player.name}, ${scatterMetrics[x].short}: ${format(p.x, x)}, ${scatterMetrics[y].short}: ${format(p.y, y)}`}
                  >
                    <circle
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={4.5}
                      fill="var(--accent)"
                      fillOpacity=".62"
                      stroke="var(--accent)"
                      strokeWidth=".5"
                    >
                      <title>
                        {p.player.name} · {format(p.x, x)} / {format(p.y, y)}
                      </title>
                    </circle>
                  </g>
                ))}
                {activePoint && (
                  <circle
                    aria-hidden="true"
                    cx={sx(activePoint.x)}
                    cy={sy(activePoint.y)}
                    r="7"
                    fill="var(--ink)"
                    stroke="var(--card)"
                    strokeWidth="2.5"
                    pointerEvents="none"
                  />
                )}
              </svg>
            ) : (
              <div className="flex min-h-80 items-center justify-center p-5 text-center text-muted">
                Ningún jugador cumple estas condiciones con datos en ambos ejes.
                Reduce los mínimos o quita alguna condición.
              </div>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Cada punto es un jugador. Las líneas discontinuas son las medias
            simples de la muestra filtrada
            {meanX !== null && meanY !== null
              ? `: ${scatterMetrics[x].short} ${format(meanX, x)} · ${scatterMetrics[y].short} ${format(meanY, y)}`
              : ""}
            .{" "}
            {scale === "fit"
              ? "Escala ajustada: los ejes pueden empezar por encima de cero."
              : "La escala incluye cero y conserva las cifras negativas cuando existen."}{" "}
            Pasa el cursor, pulsa un punto o usa el selector; con teclado,
            flechas y Enter.
          </p>
        </div>
        <aside className="min-w-0 rounded-panel border border-border bg-card p-4">
          <PlayerPicker
            label="Seleccionar jugador en el gráfico"
            value={selected}
            onChange={(value) => {
              setSelected(value);
              setHovered(null);
            }}
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
                    {data.teams.find((t) => t.id === detail.player.teamId)
                      ?.name ?? "Varios equipos"}
                  </p>
                </div>
              </div>
              <dl className="mt-4 space-y-3">
                {[
                  [scatterMetrics[x].label, format(detail.x, x)],
                  [scatterMetrics[y].label, format(detail.y, y)],
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
      </div>
      <p className="my-5 max-w-4xl text-xs leading-relaxed text-subtle">
        Las medias por partido proceden de la temporada importada. TS% y eFG%
        miden eficiencia de tiro. Los ratings de jugador describen la eficiencia
        de su equipo mientras está en pista: no son una nota individual de
        defensa. El gráfico muestra relaciones, no causas ni un ranking
        absoluto; los mínimos de partidos y minutos ayudan a evitar conclusiones
        con muestras pequeñas.
      </p>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h3 className="display text-xl font-bold">
          Clasificación de la muestra
        </h3>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">Ordenar tabla por</span>
          <select
            className={control}
            value={order}
            onChange={(e) => setOrder(e.target.value as "x" | "y")}
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
                <td className="num p-3">{format(p.x, x)}</td>
                <td className="num p-3">{format(p.y, y)}</td>
                <td className="num p-3">{nbaFormat(p.player.metrics.gp, 0)}</td>
                <td className="num p-3">{nbaFormat(p.player.metrics.min)}</td>
                <td className="p-3">
                  <button
                    type="button"
                    className={button}
                    aria-label={`Destacar ${p.player.name} en el gráfico`}
                    aria-pressed={selected === String(p.player.id)}
                    onClick={() => {
                      setSelected(String(p.player.id));
                      setHovered(null);
                      ref.current?.scrollIntoView({ block: "center" });
                    }}
                  >
                    Destacar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > limit && (
          <button
            type="button"
            className={`${button} m-3`}
            onClick={() => setLimit((n) => n + 50)}
          >
            Mostrar más · {rows.length - limit} restantes
          </button>
        )}
      </div>
    </section>
  );
}
