import type { ReactNode } from "react";

/**
 * One white panel split into indicator cells by 1px hairlines:
 * 4 columns on desktop, 2×2 below.
 */
export function KpiStrip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="mb-6">
      <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border lg:grid-cols-4">
        {children}
      </dl>
    </section>
  );
}

/**
 * Indicator cell: small-caps label, an optional team line, and the value in
 * scoreboard figures with its unit.
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
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 bg-card p-4 sm:p-5">
      <dt className="eyebrow">{label}</dt>
      <dd className="m-0 flex min-w-0 flex-col gap-2.5">
        <span className="flex min-h-6 min-w-0 items-center gap-2 text-sm font-semibold text-fg">
          {team}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span
            className={`score text-[2rem] sm:text-[2.5rem] ${highlight ? "text-accent" : "text-fg"}`}
          >
            {value}
          </span>
          <span className="text-[0.8125rem] text-subtle">{unit}</span>
        </span>
      </dd>
    </div>
  );
}
