import Link from "next/link";
import { es } from "@/lib/es";
import type { ScorerRow } from "@/lib/queries/scorers";
import { teamHref } from "@/lib/sections";
import { positionLabel } from "@/lib/translate";
import { TeamCrest } from "./TeamCrest";

const TH = "px-2 py-3 text-left text-sm font-medium text-muted md:px-3";
const c = es.scorers.columns;

function orDash(n: number | null): string {
  return n === null ? es.scorers.missing : String(n);
}

export function ScorersTable({
  slug,
  season,
  rows,
  caption = es.scorers.defaultCaption,
}: {
  slug: string;
  season: number;
  rows: ScorerRow[];
  caption?: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.goals), 0);
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-card">
      <table className="w-full table-fixed border-collapse md:table-auto">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-bg">
          <tr>
            <th scope="col" className={`${TH} w-9 md:w-auto`}>
              {c.rank}
            </th>
            <th scope="col" className={`${TH} w-[40%] md:w-auto`}>
              {c.player}
            </th>
            <th scope="col" className={TH}>
              {c.team}
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              {c.played}
            </th>
            <th scope="col" className={`${TH} w-16 text-right md:w-auto`}>
              {c.goals}
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              {c.assists}
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              {c.penalties}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pct = max > 0 ? (r.goals / max) * 100 : 0;
            return (
              <tr key={r.playerId} className="border-t border-border">
                <td className="num px-2 py-2.5 text-muted md:px-3">{r.rank}</td>
                <td className="min-w-0 px-2 py-2.5 md:px-3">
                  <span className="block truncate font-medium">{r.player}</span>
                  {r.position ? (
                    <span className="block truncate text-xs text-muted">{positionLabel(r.position)}</span>
                  ) : null}
                </td>
                <td className="min-w-0 px-2 py-2.5 md:px-3">
                  {r.team ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamCrest crest={r.team.crest} tla={r.team.tla} size={24} />
                      <Link
                        href={teamHref(slug, season, r.team.id)}
                        className="min-w-0 truncate hover:underline focus-visible:underline"
                      >
                        {r.team.shortName || r.team.name}
                      </Link>
                    </span>
                  ) : (
                    <span className="text-muted">{es.scorers.missing}</span>
                  )}
                </td>
                <td className="num hidden px-3 py-2.5 text-right md:table-cell">
                  {orDash(r.playedMatches)}
                </td>
                <td className="px-2 py-2.5 md:px-3">
                  <span className="flex items-center justify-end gap-3">
                    <span
                      aria-hidden="true"
                      className="hidden h-2 w-24 overflow-hidden rounded-full bg-border md:block"
                    >
                      <span
                        className="block h-full rounded-full bg-accent-soft"
                        style={{
                          width: `${Math.round(pct * 100) / 100}%`,
                          minWidth: r.goals > 0 ? 6 : 0,
                        }}
                      />
                    </span>
                    <span className="num w-9 text-right font-medium">{r.goals}</span>
                  </span>
                </td>
                <td className="num hidden px-3 py-2.5 text-right md:table-cell">
                  {orDash(r.assists)}
                </td>
                <td className="num hidden px-3 py-2.5 text-right md:table-cell">
                  {orDash(r.penalties)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
