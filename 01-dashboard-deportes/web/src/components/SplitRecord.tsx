import { es } from "@/lib/es";
import type { SplitRecord as Totals } from "@/lib/team";

/**
 * Home or away record as one column of a comparable pair: points in
 * scoreboard figures, then the same rows in the same order for both.
 */
export function SplitRecord({ label, record }: { label: string; record: Totals }) {
  const s = es.team.split;
  const rows: [string, string][] = [
    [s.played, String(record.played)],
    [s.record, `${record.won}-${record.drawn}-${record.lost}`],
    [s.goals, `${record.goalsFor}-${record.goalsAgainst}`],
  ];
  return (
    <div className="rounded-panel border border-border bg-card p-4 sm:p-5">
      <h3 className="eyebrow m-0">{label}</h3>
      <p className="m-0 mt-3 flex items-baseline gap-1.5">
        <span className="score text-[2.5rem] text-fg">{record.points}</span>
        <span className="text-[0.8125rem] text-subtle">{s.points}</span>
      </p>
      <dl className="m-0 mt-4 divide-y divide-border border-t border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-[0.8125rem] text-muted">{k}</dt>
            <dd className="num m-0 text-[0.9375rem] font-semibold text-fg">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
