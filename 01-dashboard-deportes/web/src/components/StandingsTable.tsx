import { es } from "@/lib/es";
import { zoneFor, type StandingRow } from "@/lib/standings";
import { FormDots } from "./FormDots";
import { PointsBar } from "./PointsBar";
import { TeamCrest } from "./TeamCrest";

const STRIPE = {
  top: "shadow-[inset_4px_0_0_var(--accent)]",
  bottom: "shadow-[inset_4px_0_0_var(--zone-bottom)]",
} as const;

const TH = "px-3 py-3 text-left text-sm font-medium text-muted";

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function StandingsTable({
  rows,
  caption = es.standings.defaultCaption,
}: {
  rows: StandingRow[];
  caption?: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.points), 0);
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-card">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-bg">
          <tr>
            <th scope="col" className={TH}>
              {es.standings.columns.position}
            </th>
            <th scope="col" className={TH}>
              {es.standings.columns.team}
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {es.standings.columns.played}
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              {es.standings.columns.goalDifference}
            </th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>
              {es.standings.columns.form}
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {es.standings.columns.points}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const zone = zoneFor(r.position, rows.length);
            return (
              <tr
                key={r.teamId}
                data-zone={zone ?? undefined}
                className={`border-t border-border ${zone ? STRIPE[zone] : ""}`}
              >
                <td className="num px-3 py-2.5 text-muted">{r.position}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <TeamCrest crest={r.crest} tla={r.tla} size={28} />
                    <span className="font-medium">{r.shortName || r.team}</span>
                  </span>
                </td>
                <td className="num px-3 py-2.5 text-right">{r.played}</td>
                <td className="num hidden px-3 py-2.5 text-right md:table-cell">
                  {signed(r.goalDifference)}
                </td>
                <td className="hidden px-3 py-2.5 md:table-cell">
                  <FormDots form={r.form} />
                </td>
                <td className="px-3 py-2.5">
                  <PointsBar points={r.points} max={max} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
