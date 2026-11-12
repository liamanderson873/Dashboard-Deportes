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

const TH = "px-1 py-3 text-left text-xs font-medium text-muted md:px-3 md:text-sm";
const TD = "px-1 py-2.5 text-right md:px-3";
const c = es.team.evolution.columns;

function cell(n: number | null) {
  return n === null ? (
    <span className="text-muted">{es.team.unavailable}</span>
  ) : (
    <span className="num">{n}</span>
  );
}

export function TeamSeasonsTable({ rows }: { rows: TeamSeasonRow[] }) {
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-card">
      <table className="w-full table-fixed border-collapse md:table-auto">
        <caption className="sr-only">{es.team.evolution.tableCaption}</caption>
        <thead className="bg-bg">
          <tr>
            <th scope="col" className={`${TH} w-24 px-2 md:w-auto`}>
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
              className={`border-t border-border ${r.current ? "bg-accent-soft/40 font-bold" : ""}`}
            >
              <th scope="row" className="px-2 py-2.5 text-left font-medium md:px-3">
                <Link
                  href={r.href}
                  className="inline-flex min-h-11 items-center text-fg underline-offset-2 hover:underline focus-visible:underline"
                >
                  {r.label}
                </Link>
                {r.current ? <span className="sr-only"> {es.team.evolution.currentRow}</span> : null}
              </th>
              <td className={TD}>{cell(r.position)}</td>
              <td className={TD}>{cell(r.played)}</td>
              <td className={TD}>{cell(r.points)}</td>
              <td className={TD}>{cell(r.goalsFor)}</td>
              <td className={TD}>{cell(r.goalsAgainst)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
