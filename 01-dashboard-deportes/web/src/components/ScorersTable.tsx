import Link from "next/link";
import { es } from "@/lib/es";
import type { ScorerRow } from "@/lib/queries/scorers";
import { teamHref } from "@/lib/sections";
import { positionLabel } from "@/lib/translate";
import { TeamCrest } from "./TeamCrest";

const TH =
  "h-9 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-subtle first:pl-4 last:pr-4";
const TD = "px-2 py-2 first:pl-4 last:pr-4";
const MD = "hidden md:table-cell";
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
      <table className="w-full table-fixed border-collapse text-[0.875rem] md:table-auto">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className={`${TH} w-11 text-right md:w-14`}>
              {c.rank}
            </th>
            <th scope="col" className={`${TH} w-[40%] text-left md:w-auto`}>
              {c.player}
            </th>
            <th scope="col" className={`${TH} text-left`}>
              {c.team}
            </th>
            <th scope="col" className={`${TH} ${MD} text-right`}>
              {c.played}
            </th>
            <th scope="col" className={`${TH} w-14 text-right md:w-48`}>
              {c.goals}
            </th>
            <th scope="col" className={`${TH} ${MD} text-right`}>
              {c.assists}
            </th>
            <th scope="col" className={`${TH} ${MD} text-right`}>
              {c.penalties}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pct = max > 0 ? (r.goals / max) * 100 : 0;
            const top = r.rank <= 3;
            return (
              <tr
                key={r.playerId}
                className="border-t border-border transition-colors duration-150 hover:bg-surface-2"
              >
                <td
                  className={`${TD} text-right ${
                    top
                      ? "score text-[1.375rem] text-accent"
                      : "num font-medium text-muted"
                  }`}
                >
                  {r.rank}
                </td>
                <td className={`${TD} min-w-0`}>
                  <span className="block truncate font-semibold text-fg">
                    {r.player}
                  </span>
                  {r.position ? (
                    <span className="block truncate text-xs text-subtle">
                      {positionLabel(r.position)}
                    </span>
                  ) : null}
                </td>
                <td className={`${TD} min-w-0`}>
                  {r.team ? (
                    <span className="flex min-w-0 items-center gap-2.5">
                      <TeamCrest
                        crest={r.team.crest}
                        tla={r.team.tla}
                        size={28}
                      />
                      <Link
                        href={teamHref(slug, season, r.team.id)}
                        title={r.team.name}
                        className="inline-flex min-h-6 min-w-0 items-center hover:underline hover:underline-offset-2"
                      >
                        <span className="truncate">
                          {r.team.shortName || r.team.name}
                        </span>
                      </Link>
                    </span>
                  ) : (
                    <span className="text-subtle">{es.scorers.missing}</span>
                  )}
                </td>
                <td className={`${TD} ${MD} num text-right text-muted`}>
                  {orDash(r.playedMatches)}
                </td>
                <td className={`${TD} bg-surface-2/70`}>
                  <span className="flex items-center justify-end gap-3">
                    <span
                      aria-hidden="true"
                      className="hidden h-1.5 flex-1 overflow-hidden rounded-[2px] bg-border md:block"
                    >
                      <span
                        className={`block h-full rounded-[2px] ${top ? "bg-accent" : "bg-accent/55"}`}
                        style={{
                          width: `${Math.round(pct * 100) / 100}%`,
                          minWidth: r.goals > 0 ? 3 : 0,
                        }}
                      />
                    </span>
                    <span className="score w-8 text-right text-[1.5rem] text-fg">
                      {r.goals}
                    </span>
                  </span>
                </td>
                <td className={`${TD} ${MD} num text-right text-muted`}>
                  {orDash(r.assists)}
                </td>
                <td className={`${TD} ${MD} num text-right text-muted`}>
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
