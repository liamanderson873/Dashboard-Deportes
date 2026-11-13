import Link from "next/link";
import { es } from "@/lib/es";

export type TeamSeasonRow = {
  season: number;
  label: string;
  href: string;
  current: boolean;
  position: number | null;
  played: number | null;
  points: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
};

const TH =
  "h-9 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-subtle first:pl-4 last:pr-4";
const TD = "h-11 px-2 text-right last:pr-4";
const c = es.team.evolution.columns;

function cell(n: number | null) {
  return n === null ? (
    <span className="text-subtle">{es.team.unavailable}</span>
  ) : (
    <span className="num">{n}</span>
  );
}

export function TeamSeasonsTable({ rows }: { rows: TeamSeasonRow[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-panel border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.875rem]">
          <caption className="sr-only">{es.team.evolution.tableCaption}</caption>
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className={`${TH} text-left`}>
                {c.season}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {c.position}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {c.played}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {c.points}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {c.goalsFor}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {c.goalsAgainst}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.season}
                aria-current={r.current ? "true" : undefined}
                className={`border-t border-border ${
                  r.current ? "bg-accent-soft/50 font-bold" : "hover:bg-surface-2"
                }`}
              >
                <th scope="row" className="h-11 whitespace-nowrap px-2 pl-4 text-left font-medium">
                  <Link
                    href={r.href}
                    className="num inline-flex min-h-6 items-center text-fg underline-offset-2 hover:underline"
                  >
                    {r.label}
                  </Link>
                  {r.current ? (
                    <span className="sr-only"> {es.team.evolution.currentRow}</span>
                  ) : null}
                </th>
                <td className={TD}>{cell(r.position)}</td>
                <td className={TD}>{cell(r.played)}</td>
                <td className={`${TD} ${r.current ? "text-accent" : ""}`}>{cell(r.points)}</td>
                <td className={TD}>{cell(r.goalsFor)}</td>
                <td className={TD}>{cell(r.goalsAgainst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
