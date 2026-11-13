import Link from "next/link";
import { es } from "@/lib/es";
import {
  groupByDay,
  isPlayed,
  kickoffLabel,
  statusLabel,
  type MatchRow,
  type TeamRef,
} from "@/lib/matches";
import { teamHref } from "@/lib/sections";
import { ScorePill } from "./ScorePill";
import { TeamCrest } from "./TeamCrest";

function TeamLink({
  team,
  slug,
  season,
  side,
}: {
  team: TeamRef;
  slug: string;
  season: number;
  side: "home" | "away";
}) {
  const crest = <TeamCrest crest={team.crest} tla={team.tla} size={24} />;
  const name = <span className="min-w-0 truncate">{team.shortName}</span>;
  return (
    <Link
      href={teamHref(slug, season, team.id)}
      title={team.name}
      className={`flex min-h-11 min-w-0 items-center gap-2 text-[0.9375rem] font-semibold text-fg hover:underline hover:underline-offset-2 ${
        side === "home" ? "justify-end text-right" : "justify-start"
      }`}
    >
      {side === "home" ? (
        <>
          {name}
          {crest}
        </>
      ) : (
        <>
          {crest}
          {name}
        </>
      )}
    </Link>
  );
}

function MatchItem({ m, slug, season }: { m: MatchRow; slug: string; season: number }) {
  const played = isPlayed(m);
  const label = statusLabel(m.status);
  const halfTime =
    played && m.homeHtGoals !== null && m.awayHtGoals !== null
      ? `(${m.homeHtGoals}-${m.awayHtGoals})`
      : null;
  return (
    <li className="px-3 py-2 sm:px-4">
      <div className="mx-auto grid max-w-[820px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 sm:gap-x-4">
      <TeamLink team={m.home} slug={slug} season={season} side="home" />
      <div className="flex w-[5.75rem] flex-col items-center gap-1 sm:w-28">
        {played ? (
          <ScorePill>
            <span aria-hidden="true">
              {m.homeGoals} - {m.awayGoals}
            </span>
            <span className="sr-only">
              {es.results.score(m.home.shortName, m.homeGoals ?? 0, m.away.shortName, m.awayGoals ?? 0)}
            </span>
          </ScorePill>
        ) : (
          <ScorePill pending>{kickoffLabel(m)}</ScorePill>
        )}
        {halfTime || label ? (
          <span className="num text-center text-xs leading-tight text-subtle">
            {halfTime ? (
              <span title={es.results.halfTime}>
                <span className="sr-only">{es.results.halfTime} </span>
                {halfTime}
              </span>
            ) : null}
            {halfTime && label ? " · " : null}
            {label}
          </span>
        ) : null}
      </div>
      <TeamLink team={m.away} slug={slug} season={season} side="away" />
      </div>
    </li>
  );
}

export function MatchList({
  slug,
  season,
  matches,
  headingLevel = 2,
}: {
  slug: string;
  season: number;
  matches: MatchRow[];
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className="flex flex-col gap-6">
      {groupByDay(matches).map((g) => (
        <section key={g.day}>
          <Heading className="eyebrow mono mb-2 !font-medium">
            {g.day.charAt(0).toUpperCase() + g.day.slice(1)}
          </Heading>
          <ul className="m-0 list-none divide-y divide-border overflow-hidden rounded-panel border border-border bg-card p-0">
            {g.matches.map((m) => (
              <MatchItem key={m.id} m={m} slug={slug} season={season} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
