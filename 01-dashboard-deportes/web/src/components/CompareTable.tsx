import { es } from "@/lib/es";
import type { CompareRow } from "@/lib/compare";
import type { StandingRow } from "@/lib/standings";
import { TeamCrest } from "./TeamCrest";

const TH = "px-3 py-3 text-sm font-medium";

function TeamHead({ team }: { team: StandingRow }) {
  return (
    <th scope="col" className={`${TH} text-right`}>
      <span className="inline-flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <TeamCrest crest={team.crest} tla={team.tla} size={28} />
        <span className="break-words">{team.shortName}</span>
      </span>
    </th>
  );
}

function Value({ text, best }: { text: string; best: boolean }) {
  return (
    <td className={`num px-3 py-2.5 text-right ${best ? "font-bold" : ""}`}>
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
            <th scope="col" className={`${TH} w-2/5 text-left text-muted`}>
              {es.compare.table.metric}
            </th>
            <TeamHead team={a} />
            <TeamHead team={b} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <th scope="row" className="px-3 py-2.5 text-left text-sm font-normal text-muted">
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
