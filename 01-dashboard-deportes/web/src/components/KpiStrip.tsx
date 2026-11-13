import type { ReactNode } from "react";

/**
 * One white panel split into indicator cells by 1px hairlines:
 * 4 columns on desktop, 2×2 below. `columns={6}` gives 6 on desktop and 3×2
 * on tablet (team performance); `bare` drops the bottom margin so the strip
 * can sit inside a titled panel.
 */
export function KpiStrip({
  label,
  columns = 4,
  bare = false,
  children,
}: {
  label: string;
  columns?: 4 | 6;
  bare?: boolean;
  children: ReactNode;
}) {
  const grid = columns === 6 ? "md:grid-cols-3 lg:grid-cols-6" : "lg:grid-cols-4";
  return (
    <section aria-label={label} className={bare ? "" : "mb-6"}>
      <dl
        className={`m-0 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border ${grid}`}
      >
        {children}
      </dl>
    </section>
  );
}

/**
 * Indicator cell: small-caps label, an optional team line, and the value in
 * scoreboard figures with its optional unit. `value` may be a node (form chips).
 */
export function KpiCell({
  label,
  team,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  team?: ReactNode;
  value: ReactNode;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 bg-card p-4 sm:p-5">
      <dt className="eyebrow">{label}</dt>
      <dd className="m-0 flex min-w-0 flex-col gap-2.5">
        {team ? (
          <span className="flex min-h-6 min-w-0 items-center gap-2 text-sm font-semibold text-fg">
            {team}
          </span>
        ) : null}
        <span className="flex min-h-[2.5rem] items-baseline gap-1.5">
          <span
            className={`score text-[2rem] sm:text-[2.5rem] ${highlight ? "text-accent" : "text-fg"}`}
          >
            {value}
          </span>
          {unit ? <span className="text-[0.8125rem] text-subtle">{unit}</span> : null}
        </span>
      </dd>
    </div>
  );
}
