import Link from "next/link";
import { es } from "@/lib/es";
import { teamHref } from "@/lib/sections";
import { zoneFor, type StandingRow } from "@/lib/standings";
import { FormDots } from "./FormDots";
import { PointsBar } from "./PointsBar";
import { TeamCrest } from "./TeamCrest";

// 3px mark on the left edge of the position cell (inset shadow, so it does not
// shift the column).
const ZONE_MARK = {
  top: "shadow-[inset_3px_0_0_var(--accent)]",
  bottom: "shadow-[inset_3px_0_0_var(--zone-bottom)]",
} as const;

const TH =
  "h-9 whitespace-nowrap px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-subtle first:pl-4 last:pr-4";
const TD = "h-11 whitespace-nowrap px-2 first:pl-4 last:pr-4";
const LG = "hidden lg:table-cell";
const MD = "hidden md:table-cell";

const c = es.standings.columns;
const t = es.standings.columnTitles;

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function Abbr({ title, children }: { title: string; children: string }) {
  return (
    <abbr title={title} className="no-underline">
      {children}
    </abbr>
  );
}

export function StandingsTable({
  slug,
  season,
  rows,
  caption = es.standings.defaultCaption,
}: {
  slug: string;
  season: number;
  rows: StandingRow[];
  caption?: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.points), 0);
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.875rem]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className={`${TH} w-12 text-right`}>
                <Abbr title={t.position}>{c.position}</Abbr>
              </th>
              <th scope="col" className={`${TH} text-left`}>
                {c.team}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                <Abbr title={t.played}>{c.played}</Abbr>
              </th>
              <th scope="col" className={`${TH} ${LG} text-right`}>
                <Abbr title={t.won}>{c.won}</Abbr>
              </th>
              <th scope="col" className={`${TH} ${LG} text-right`}>
                <Abbr title={t.drawn}>{c.drawn}</Abbr>
              </th>
              <th scope="col" className={`${TH} ${LG} text-right`}>
                <Abbr title={t.lost}>{c.lost}</Abbr>
              </th>
              <th scope="col" className={`${TH} ${LG} text-right`}>
                <Abbr title={t.goalsFor}>{c.goalsFor}</Abbr>
              </th>
              <th scope="col" className={`${TH} ${LG} text-right`}>
                <Abbr title={t.goalsAgainst}>{c.goalsAgainst}</Abbr>
              </th>
              <th scope="col" className={`${TH} ${MD} text-right`}>
                <Abbr title={t.goalDifference}>{c.goalDifference}</Abbr>
              </th>
              <th scope="col" className={`${TH} ${MD} pl-4 text-left`}>
                <Abbr title={t.form}>{c.form}</Abbr>
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {c.points}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const zone = zoneFor(r.position, rows.length);
              const name = r.shortName || r.team;
              return (
                <tr
                  key={r.teamId}
                  data-zone={zone ?? undefined}
                  className="border-t border-border transition-colors duration-150 hover:bg-surface-2"
                >
                  <td
                    className={`${TD} num text-right font-medium text-muted ${zone ? ZONE_MARK[zone] : ""}`}
                  >
                    {r.position}
                    {zone ? <span className="sr-only"> ({es.standings.zones[zone]})</span> : null}
                  </td>
                  <td className={`${TD} w-full max-w-0`}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <TeamCrest crest={r.crest} tla={r.tla} size={22} />
                      <Link
                        href={teamHref(slug, season, r.teamId)}
                        title={r.team || name}
                        className="inline-flex min-h-6 min-w-0 items-center rounded-[4px] font-semibold text-fg hover:underline hover:underline-offset-2"
                      >
                        <span className="truncate">{name}</span>
                      </Link>
                    </span>
                  </td>
                  <td className={`${TD} num text-right text-muted`}>{r.played}</td>
                  <td className={`${TD} ${LG} num text-right text-muted`}>{r.won}</td>
                  <td className={`${TD} ${LG} num text-right text-muted`}>{r.drawn}</td>
                  <td className={`${TD} ${LG} num text-right text-muted`}>{r.lost}</td>
                  <td className={`${TD} ${LG} num text-right text-muted`}>{r.goalsFor}</td>
                  <td className={`${TD} ${LG} num text-right text-muted`}>{r.goalsAgainst}</td>
                  <td className={`${TD} ${MD} num text-right font-medium text-fg`}>
                    {signed(r.goalDifference)}
                  </td>
                  <td className={`${TD} ${MD} pl-4`}>
                    <FormDots form={r.form} />
                  </td>
                  <td className={`${TD} bg-surface-2/70`}>
                    <PointsBar points={r.points} max={max} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Explains the zone marks with text (not colour alone) and the form chips. */
export function StandingsLegend({ showZones }: { showZones: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8125rem] text-muted">
      <span className="sr-only">{es.standings.legendTitle}: </span>
      {showZones ? (
        <>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-3.5 w-[3px] rounded-[1px] bg-accent" />
            {es.standings.legendTop}
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-3.5 w-[3px] rounded-[1px] bg-zone-bottom" />
            {es.standings.legendBottom}
          </span>
        </>
      ) : null}
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-flex">
          <FormDots form={["W", "D", "L"]} />
        </span>
        {es.standings.legendForm}
      </span>
    </div>
  );
}
