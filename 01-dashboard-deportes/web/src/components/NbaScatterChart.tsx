"use client";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { nbaFormat } from "@/lib/nba";
import {
  scatterMetrics,
  type ScatterMetric,
  type ScatterPoint,
} from "@/lib/nba-scatter";
import type { numericAxis } from "@/lib/nba-visuals";

type Axis = ReturnType<typeof numericAxis>;

/** Interactive SVG scatter: grid, axes, means and one focusable point per player. */
export function ScatterChart({
  points,
  x,
  y,
  id,
  selected,
  activePoint,
  width,
  height,
  top,
  bottom,
  left,
  right,
  pw,
  xAxis,
  yAxis,
  sx,
  sy,
  meanX,
  meanY,
  format,
  onKeys,
  nearest,
  setHovered,
  setSelected,
}: {
  points: ScatterPoint[];
  x: ScatterMetric;
  y: ScatterMetric;
  id: string;
  selected: string;
  activePoint: ScatterPoint | undefined;
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  pw: number;
  xAxis: Axis;
  yAxis: Axis;
  sx: (value: number) => number;
  sy: (value: number) => number;
  meanX: number | null;
  meanY: number | null;
  format: (value: number, metric: ScatterMetric) => string;
  onKeys: (event: KeyboardEvent<SVGSVGElement>) => void;
  nearest: (
    event: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>,
  ) => ScatterPoint | undefined;
  setHovered: (id: number | null) => void;
  setSelected: (id: string) => void;
}) {
  return (
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
        if (!activePoint && points[0]) setHovered(points[0].player.id);
      }}
      onPointerMove={(event) => setHovered(nearest(event)?.player.id ?? null)}
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
        <text x={left} y="15" fontSize="12" fontWeight="600" fill="var(--fg)">
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
  );
}
