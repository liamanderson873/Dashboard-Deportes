import Link from "next/link";
import { es } from "@/lib/es";
import { formatMatchDate, kickoffLabel, statusLabel } from "@/lib/matches";
import { teamHref } from "@/lib/sections";
import type { TeamMatch } from "@/lib/team";
import { ScorePill } from "./ScorePill";
import { TeamCrest } from "./TeamCrest";

const COLOR = { W: "bg-win", D: "bg-draw", L: "bg-loss" } as const;

function Item({ t, slug, season }: { t: TeamMatch; slug: string; season: number }) {
  const { match, opponent } = t;
  const label = statusLabel(match.status);
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:px-4">
      <span className="mono text-xs text-subtle">
        {match.matchday !== null ? es.team.matches.matchday(match.matchday) : ""}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="mono text-[0.6875rem] text-subtle">{formatMatchDate(match.utcDate)}</span>
        <Link
          href={teamHref(slug, season, opponent.id)}
          title={opponent.name}
          className="flex min-h-9 min-w-0 items-center gap-2 text-[0.9375rem] font-semibold text-fg hover:underline hover:underline-offset-2"
        >
          <span className="w-4 shrink-0 text-xs font-normal text-subtle">
            {t.isHome ? es.team.matches.home : es.team.matches.away}
          </span>
          <TeamCrest crest={opponent.crest} tla={opponent.tla} size={24} />
          <span className="min-w-0 truncate">{opponent.shortName}</span>
        </Link>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {t.result !== null ? (
          <span className="flex items-center gap-2">
            <ScorePill>
              {t.goalsFor} - {t.goalsAgainst}
            </ScorePill>
            <span
              aria-hidden="true"
              className={`inline-flex size-[18px] items-center justify-center rounded-[4px] text-[10px] font-bold leading-none text-white ${COLOR[t.result]}`}
            >
              {es.form.letters[t.result]}
            </span>
            <span className="sr-only">{es.form.results[t.result]}</span>
          </span>
        ) : (
          <ScorePill pending>{kickoffLabel(match)}</ScorePill>
        )}
        {label ? <span className="text-xs text-subtle">{label}</span> : null}
      </div>
    </li>
  );
}

function Group({
  title,
  items,
  slug,
  season,
}: {
  title: string;
  items: TeamMatch[];
  slug: string;
  season: number;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="eyebrow mb-2">{title}</h3>
      <ul className="m-0 list-none divide-y divide-border overflow-hidden rounded-panel border border-border bg-card p-0">
        {items.map((t) => (
          <Item key={t.match.id} t={t} slug={slug} season={season} />
        ))}
      </ul>
    </section>
  );
}

export function TeamMatchList({
  slug,
  season,
  matches,
}: {
  slug: string;
  season: number;
  matches: TeamMatch[];
}) {
  const played = matches.filter((t) => t.result !== null).reverse();
  const upcoming = matches.filter((t) => t.result === null);
  return (
    <div className="flex flex-col gap-6">
      <Group title={es.team.matches.played} items={played} slug={slug} season={season} />
      <Group title={es.team.matches.upcoming} items={upcoming} slug={slug} season={season} />
    </div>
  );
}
