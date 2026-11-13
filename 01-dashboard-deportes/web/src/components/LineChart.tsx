import { layoutLineChart, projectX, projectY, type Series } from "@/lib/chart";
import { es } from "@/lib/es";

const SIZE = { width: 480, height: 300, padding: 50 };
const HIGHLIGHT_WIDTH = 2.5;
const OTHER_WIDTH = 1.5;
const OTHER_DASH = "6 4";

function Swatch({ highlight }: { highlight: boolean }) {
  return (
    <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" className="shrink-0">
      <line
        x1="0"
        y1="4"
        x2="28"
        y2="4"
        stroke={highlight ? "var(--accent)" : "var(--muted)"}
        strokeWidth={highlight ? HIGHLIGHT_WIDTH : OTHER_WIDTH}
        strokeDasharray={highlight ? undefined : OTHER_DASH}
      />
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
  const layout = layoutLineChart(series, SIZE);
  const { width, height, padding } = SIZE;
  const top = layout.yTicks[layout.yTicks.length - 1];
  const left = padding;
  const right = width - padding;
  const bottom = height - padding;
  const midY = (padding + bottom) / 2;
  // Highlighted series last so it paints on top.
  const ordered = [...layout.paths].sort(
    (a, b) => Number(a.highlight) - Number(b.highlight),
  );

  return (
    <figure className="m-0 flex flex-col gap-3">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block h-auto w-full max-w-[640px] text-[18px] text-muted md:text-[11px]"
      >
        {layout.yTicks.map((t) => {
          const y = projectY(t, top, SIZE);
          return (
            <g key={`y${t}`}>
              <line x1={left} x2={right} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={left - 8} y={y + 5} textAnchor="end" fill="currentColor" className="num">
                {t}
              </text>
            </g>
          );
        })}
        {layout.xTicks.map((t) => (
          <text
            key={`x${t}`}
            x={projectX(t, layout.xMax, SIZE)}
            y={bottom + 20}
            textAnchor="middle"
            fill="currentColor"
            className="num"
          >
            {t}
          </text>
        ))}
        <text x={(left + right) / 2} y={height - 6} textAnchor="middle" fill="currentColor">
          {xLabel}
        </text>
        <text
          x={14}
          y={midY}
          textAnchor="middle"
          fill="currentColor"
          transform={`rotate(-90 14 ${midY})`}
        >
          {yLabel}
        </text>
        {ordered.map((p) => (
          <path
            key={p.id}
            data-series={p.id}
            d={p.d}
            fill="none"
            stroke={p.highlight ? "var(--accent)" : "var(--muted)"}
            strokeWidth={p.highlight ? HIGHLIGHT_WIDTH : OTHER_WIDTH}
            strokeDasharray={p.highlight ? undefined : OTHER_DASH}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {ordered.map((p) => {
          const s = series.find((x) => x.id === p.id);
          const only = s?.points.length === 1 ? s.points[0] : undefined;
          if (!only) return null;
          return (
            <circle
              key={`dot${p.id}`}
              cx={projectX(only.x, layout.xMax, SIZE)}
              cy={projectY(only.y, top, SIZE)}
              r={p.highlight ? 4 : 3}
              fill={p.highlight ? "var(--accent)" : "var(--muted)"}
            />
          );
        })}
      </svg>
      <figcaption>
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm">
          {series.map((s) => (
            <li
              key={s.id}
              className={`flex items-center gap-2 ${s.highlight ? "font-bold text-accent" : "text-muted"}`}
            >
              <Swatch highlight={s.highlight} />
              <span>
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
