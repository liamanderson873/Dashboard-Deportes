import {
  layoutLineChart,
  plotBox,
  projectX,
  projectY,
  spreadLabels,
  type Series,
  type Size,
} from "@/lib/chart";
import { es } from "@/lib/es";

const HIGHLIGHT_WIDTH = 2.5;
const OTHER_WIDTH = 1.5;
const OTHER_DASH = "6 4";
const FONT = 11;

/**
 * One viewBox per width range, so the 11px axis text keeps its size on screen
 * (a single viewBox would shrink it on phones). Only one variant is displayed;
 * the others are `display: none`, so assistive tech sees a single chart.
 */
const VARIANTS: { key: string; size: Size; className: string }[] = [
  {
    key: "xs",
    size: { width: 360, height: 300, padding: 34, paddingTop: 30, paddingRight: 60, paddingBottom: 44 },
    className: "block min-[480px]:hidden",
  },
  {
    key: "sm",
    size: { width: 560, height: 280, padding: 38, paddingTop: 30, paddingRight: 64, paddingBottom: 46 },
    className: "hidden min-[480px]:block md:hidden",
  },
  {
    key: "md",
    size: { width: 760, height: 330, padding: 42, paddingTop: 32, paddingRight: 68, paddingBottom: 48 },
    className: "hidden md:block lg:hidden",
  },
  {
    key: "lg",
    size: { width: 1100, height: 480, padding: 46, paddingTop: 34, paddingRight: 72, paddingBottom: 52 },
    className: "hidden lg:block",
  },
];

function Swatch({ highlight }: { highlight: boolean }) {
  return (
    <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" className="shrink-0">
      <line
        x1="0"
        y1="4"
        x2="28"
        y2="4"
        stroke={highlight ? "var(--accent)" : "var(--draw)"}
        strokeWidth={highlight ? HIGHLIGHT_WIDTH : OTHER_WIDTH}
        strokeDasharray={highlight ? undefined : OTHER_DASH}
      />
    </svg>
  );
}

function Plot({
  series,
  size,
  className,
  ariaLabel,
  xLabel,
  yLabel,
}: {
  series: Series[];
  size: Size;
  className: string;
  ariaLabel: string;
  xLabel: string;
  yLabel: string;
}) {
  const layout = layoutLineChart(series, size);
  const { width, height } = size;
  const top = layout.yTicks[layout.yTicks.length - 1];
  const box = plotBox(size);
  // Highlighted series last so it paints on top.
  const ordered = [...layout.paths].sort((a, b) => Number(a.highlight) - Number(b.highlight));

  const ends = series
    .map((s) => {
      const last = s.points[s.points.length - 1];
      return last
        ? {
            id: s.id,
            label: s.label,
            highlight: s.highlight,
            x: projectX(last.x, layout.xMax, size),
            y: projectY(last.y, top, size),
          }
        : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const labelY = spreadLabels(
    ends.map((e) => ({ id: e.id, y: e.y + FONT * 0.35 })),
    FONT + 3,
    box.top + FONT * 0.35,
    box.bottom,
  );

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      className={`mx-auto h-auto w-full ${className}`}
      fontSize={FONT}
    >
      {layout.yTicks.map((t) => {
        const y = projectY(t, top, size);
        return (
          <g key={`y${t}`}>
            <line
              x1={box.left}
              x2={box.right}
              y1={y}
              y2={y}
              stroke={t === 0 ? "var(--border-strong)" : "var(--border)"}
              strokeWidth="1"
            />
            <text
              x={box.left - 8}
              y={y + FONT * 0.35}
              textAnchor="end"
              fill="var(--subtle)"
              className="mono"
            >
              {t}
            </text>
          </g>
        );
      })}
      {layout.xTicks.map((t) => (
        <text
          key={`x${t}`}
          x={projectX(t, layout.xMax, size)}
          y={box.bottom + 18}
          textAnchor="middle"
          fill="var(--subtle)"
          className="mono"
        >
          {t}
        </text>
      ))}
      <text x={(box.left + box.right) / 2} y={height - 6} textAnchor="middle" fill="var(--subtle)" className="mono">
        {xLabel}
      </text>
      <text x={box.left} y={14} textAnchor="start" fill="var(--subtle)" className="mono">
        {yLabel}
      </text>
      {ordered.map((p) => (
        <path
          key={p.id}
          data-series={p.id}
          d={p.d}
          fill="none"
          stroke={p.highlight ? "var(--accent)" : "var(--draw)"}
          strokeWidth={p.highlight ? HIGHLIGHT_WIDTH : OTHER_WIDTH}
          strokeDasharray={p.highlight ? undefined : OTHER_DASH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {[...ends]
        .sort((a, b) => Number(a.highlight) - Number(b.highlight))
        .map((e) => (
          <g key={`end${e.id}`}>
            <circle
              cx={e.x}
              cy={e.y}
              r={e.highlight ? 4.5 : 3.5}
              fill={e.highlight ? "var(--accent)" : "var(--card)"}
              stroke={e.highlight ? "var(--card)" : "var(--draw)"}
              strokeWidth={e.highlight ? 1.5 : 1.5}
            />
            <text
              x={e.x + 9}
              y={labelY.get(e.id)}
              fill={e.highlight ? "var(--accent)" : "var(--subtle)"}
              fontWeight={e.highlight ? 700 : 500}
              stroke="var(--card)"
              strokeWidth="3"
              paintOrder="stroke"
              className="mono"
            >
              {e.label}
            </text>
          </g>
        ))}
    </svg>
  );
}

export function LineChart({
  series,
  ariaLabel,
  xLabel,
  yLabel,
}: {
  series: Series[];
  ariaLabel: string;
  xLabel: string;
  yLabel: string;
}) {
  return (
    <figure className="m-0 flex flex-col gap-3">
      {VARIANTS.map((v) => (
        <Plot
          key={v.key}
          series={series}
          size={v.size}
          className={v.className}
          ariaLabel={ariaLabel}
          xLabel={xLabel}
          yLabel={yLabel}
        />
      ))}
      <figcaption>
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[0.8125rem]">
          {series.map((s) => (
            <li
              key={s.id}
              className={`flex items-center gap-2 ${s.highlight ? "font-bold text-accent" : "text-muted"}`}
            >
              <Swatch highlight={s.highlight} />
              <span className="num">
                {s.label}
                {s.highlight ? ` (${es.team.evolution.currentSeason})` : ""}
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
