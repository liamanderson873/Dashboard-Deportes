import { es } from "@/lib/es";
import type { CompareRow } from "@/lib/compare";
import type { StandingRow } from "@/lib/standings";
import { TeamCrest } from "./TeamCrest";

const TH = "px-2 py-3 text-sm font-medium md:px-3";

function TeamHead({ team }: { team: StandingRow }) {
  return (
    <th scope="col" className={`${TH} text-right`}>
      <span className="inline-flex min-w-0 max-w-full flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <TeamCrest crest={team.crest} tla={team.tla} size={28} />
        <span className="min-w-0 break-words">{team.shortName}</span>
      </span>
    </th>
  );
}

function Value({ text, best }: { text: string; best: boolean }) {
  return (
    <td className={`num px-2 py-2.5 text-right md:px-3 ${best ? "font-bold" : ""}`}>
      {text}
      {best ? <span className="sr-only">{es.compare.table.better}</span> : null}
    </td>
  );
}

export function CompareTable({
  a,
  b,
  rows,
}: {
  a: StandingRow;
  b: StandingRow;
  rows: CompareRow[];
}) {
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-card">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">{es.compare.table.caption(a.team, b.team)}</caption>
        <thead className="bg-bg">
          <tr>
            <th scope="col" className={`${TH} w-[38%] text-left text-muted`}>
              {es.compare.table.metric}
            </th>
            <TeamHead team={a} />
            <TeamHead team={b} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <th scope="row" className="px-2 py-2.5 text-left text-sm font-normal text-muted md:px-3">
                {r.label}
              </th>
              <Value text={r.a} best={r.better === "a"} />
              <Value text={r.b} best={r.better === "b"} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
