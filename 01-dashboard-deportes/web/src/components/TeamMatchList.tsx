import Link from "next/link";
import { es } from "@/lib/es";
import { formatMatchDate, kickoffLabel, statusLabel } from "@/lib/matches";
import { teamHref } from "@/lib/sections";
import type { TeamMatch } from "@/lib/team";
import { TeamCrest } from "./TeamCrest";

const COLOR = { W: "bg-win", D: "bg-draw", L: "bg-loss" } as const;

function Item({ t, slug, season }: { t: TeamMatch; slug: string; season: number }) {
  const { match, opponent } = t;
  const label = statusLabel(match.status);
  return (
    <li className="flex items-center gap-3 rounded-card border border-border bg-card px-3 py-1">
      <div className="num w-8 shrink-0 text-xs text-muted">
        {match.matchday !== null ? es.team.matches.matchday(match.matchday) : ""}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="num text-xs text-muted">{formatMatchDate(match.utcDate)}</span>
        <Link
          href={teamHref(slug, season, opponent.id)}
          title={opponent.name}
          className="flex min-h-11 min-w-0 items-center gap-2 hover:underline"
        >
          <span className="text-muted">
            {t.isHome ? es.team.matches.home : es.team.matches.away}
          </span>
          <TeamCrest crest={opponent.crest} tla={opponent.tla} size={24} />
          <span className="min-w-0 truncate">{opponent.shortName}</span>
        </Link>
      </div>
      <div className="num flex shrink-0 flex-col items-end text-right">
        {t.result !== null ? (
          <span className="flex items-center gap-2 font-bold">
            {t.goalsFor} - {t.goalsAgainst}
            <span
              aria-hidden="true"
              className={`inline-flex size-[22px] items-center justify-center rounded-full text-[11px] font-medium text-white ${COLOR[t.result]}`}
            >
              {es.form.letters[t.result]}
            </span>
            <span className="sr-only">{es.form.results[t.result]}</span>
          </span>
        ) : (
          <span className="text-muted">{kickoffLabel(match)}</span>
        )}
        {label ? <span className="text-xs text-muted">{label}</span> : null}
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
      <h3 className="mb-2 text-sm font-medium text-muted">{title}</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
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
