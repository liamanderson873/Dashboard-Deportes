import Link from "next/link";
import { es } from "@/lib/es";
import type { ScorerRow } from "@/lib/queries/scorers";
import { teamHref } from "@/lib/sections";
import { TeamCrest } from "./TeamCrest";

const TH = "px-3 py-3 text-left text-sm font-medium text-muted";
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
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-bg">
          <tr>
            <th scope="col" className={TH}>
              {c.rank}
            </th>
            <th scope="col" className={TH}>
              {c.player}
            </th>
            <th scope="col" className={TH}>
              {c.team}
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              {c.played}
            </th>
            <th scope="col" className={`${TH} text-right`}>
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
                <td className="num px-3 py-2.5 text-muted">{r.rank}</td>
                <td className="px-3 py-2.5">
                  <span className="block font-medium">{r.player}</span>
                  {r.position ? (
                    <span className="block text-xs text-muted">{r.position}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5">
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
                <td className="px-3 py-2.5">
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
