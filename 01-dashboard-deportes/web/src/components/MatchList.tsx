import Link from "next/link";
import { es } from "@/lib/es";
import {
  formatMatchTime,
  groupByDay,
  isPlayed,
  statusLabel,
  type MatchRow,
  type TeamRef,
} from "@/lib/matches";
import { teamHref } from "@/lib/sections";
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
      className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 hover:underline ${
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
    <li className="rounded-card border border-border bg-card px-3 py-1">
      <div className="flex items-center gap-2">
        <TeamLink team={m.home} slug={slug} season={season} side="home" />
        <div className="num flex w-20 shrink-0 flex-col items-center text-center">
          {played ? (
            <span className="font-bold">
              {m.homeGoals} - {m.awayGoals}
            </span>
          ) : (
            <span className="text-muted">{formatMatchTime(m.utcDate)}</span>
          )}
          {halfTime ? (
            <span className="text-xs text-muted" title={es.results.halfTime}>
              {halfTime}
            </span>
          ) : null}
        </div>
        <TeamLink team={m.away} slug={slug} season={season} side="away" />
      </div>
      {label ? <p className="pb-1 text-center text-xs text-muted">{label}</p> : null}
    </li>
  );
}

export function MatchList({
  slug,
  season,
  matches,
}: {
  slug: string;
  season: number;
  matches: MatchRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {groupByDay(matches).map((g) => (
        <section key={g.day}>
          <h2 className="mb-2 text-sm font-medium capitalize text-muted">{g.day}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {g.matches.map((m) => (
              <MatchItem key={m.id} m={m} slug={slug} season={season} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
