"use client";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { type NbaData } from "@/lib/nba";
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
import { usePlotWidth } from "./usePlotWidth";
import {
  button,
  control,
  formatMetric,
  metricOptions,
  ScatterDetail,
  ScatterLeaders,
  ScatterRuleBuilder,
  ScatterTable,
} from "./NbaScatterParts";
import { ScatterChart } from "./NbaScatterChart";
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
    leaderY = sortScatter(points, "y", y)[0];
  const format = formatMetric;
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
      <ScatterRuleBuilder
        rules={rules}
        onAdd={(rule) => {
          setRules([...rules, rule]);
          setLimit(50);
        }}
        onRemove={(index) => setRules(rules.filter((_, i) => i !== index))}
      />
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
      <ScatterLeaders x={x} y={y} leaderX={leaderX} leaderY={leaderY} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 rounded-panel border border-border bg-card p-3 sm:p-4">
          <div ref={ref} className="min-w-0">
            {!!points.length ? (
              <ScatterChart
                points={points}
                x={x}
                y={y}
                id={id}
                selected={selected}
                activePoint={activePoint}
                width={width}
                height={height}
                top={top}
                bottom={bottom}
                left={left}
                right={right}
                pw={pw}
                xAxis={xAxis}
                yAxis={yAxis}
                sx={sx}
                sy={sy}
                meanX={meanX}
                meanY={meanY}
                format={format}
                onKeys={onKeys}
                nearest={nearest}
                setHovered={setHovered}
                setSelected={setSelected}
              />
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
        <ScatterDetail
          data={data}
          points={points}
          x={x}
          y={y}
          selected={selected}
          detail={detail}
          onSelect={(value) => {
            setSelected(value);
            setHovered(null);
          }}
        />
      </div>
      <p className="my-5 max-w-4xl text-xs leading-relaxed text-subtle">
        Las medias por partido proceden de la temporada importada. TS% y eFG%
        miden eficiencia de tiro. Los ratings de jugador describen la eficiencia
        de su equipo mientras está en pista: no son una nota individual de
        defensa. El gráfico muestra relaciones, no causas ni un ranking
        absoluto; los mínimos de partidos y minutos ayudan a evitar conclusiones
        con muestras pequeñas.
      </p>
      <ScatterTable
        data={data}
        rows={rows}
        x={x}
        y={y}
        selected={selected}
        order={order}
        onOrder={setOrder}
        limit={limit}
        onMore={() => setLimit((n) => n + 50)}
        onHighlight={(playerId) => {
          setSelected(String(playerId));
          setHovered(null);
          ref.current?.scrollIntoView({ block: "center" });
        }}
      />
    </section>
  );
}
