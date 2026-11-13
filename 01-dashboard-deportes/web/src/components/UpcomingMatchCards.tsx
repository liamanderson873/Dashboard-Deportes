"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlayerData } from "@/lib/player-analytics";
import { isLiveMatch, matchViews } from "@/lib/player-browsing";
import { FootballTeamLogo } from "./TeamCrest";
import { pe } from "@/lib/players-es";

export function MatchCards({
  data,
  base,
  now,
}: {
  data: PlayerData;
  base: string;
  now: string;
}) {
  const groups = matchViews(data.matches, now);
  const [view, setView] = useState<keyof typeof groups>(
    groups.upcoming.length ? "upcoming" : "results",
  );
  const [limit, setLimit] = useState(12);
  const matches = groups[view];
  const labels = {
    upcoming: pe.upcomingMatches,
    results: pe.recentResults,
    season: pe.wholeSeason,
  };
  const next = groups.upcoming[0];
  const logo = (id: number, name: string, size = 30) => (
    <FootballTeamLogo
      id={data.teams.find((t) => t.id === id)?.localId ?? null}
      name={name}
      size={size}
    />
  );
  return (
    <section className="my-6">
      {next && (
        <Link
          href={`${base}/partido/${next.id}`}
          className="mb-6 grid gap-5 rounded-panel bg-ink p-5 text-on-ink transition-shadow hover:ring-2 hover:ring-accent sm:grid-cols-[1fr_auto] sm:items-center sm:p-7"
        >
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-on-ink-muted">
              {isLiveMatch(next) ? pe.liveMatch : pe.nextMatch}
            </p>
            <p className="display text-2xl font-bold sm:text-3xl">
              <span className="inline-flex items-center gap-2">
                {logo(next.homeId, next.home, 40)}
                {next.home}
              </span>{" "}
              <span className="mx-1 text-lg font-normal text-on-ink-muted">
                vs
              </span>{" "}
              <span className="inline-flex items-center gap-2">
                {logo(next.awayId, next.away, 40)}
                {next.away}
              </span>
            </p>
            <p className="mono mt-3 text-xs text-on-ink-muted">
              {new Date(next.date).toLocaleString("es-ES", {
                timeZone: "Europe/Madrid",
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold">
            Ver partido <span aria-hidden="true">↗</span>
          </span>
        </Link>
      )}
      <h2 className="display mb-4 text-2xl font-bold">
        Calendario y resultados
      </h2>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label={pe.matchView}
      >
        {(Object.keys(labels) as (keyof typeof labels)[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => {
              setView(id);
              setLimit(12);
            }}
            className={`min-h-11 rounded-control border px-3 py-2 text-sm font-semibold ${view === id ? "border-accent bg-accent-soft text-accent" : "border-border-strong bg-card hover:bg-surface-2"}`}
          >
            {labels[id]} ({groups[id].length})
          </button>
        ))}
      </div>
      <p role="status" className="mb-4 text-sm text-subtle">
        {view === "upcoming"
          ? pe.nearestFirst
          : view === "results"
            ? pe.newestFirst
            : pe.oldestFirst}
      </p>
      {!matches.length ? (
        <p className="rounded-panel border border-border bg-card p-5">
          {view === "upcoming" ? pe.noUpcoming : pe.noMatches}
        </p>
      ) : (
        <ul className="grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
          {matches.slice(0, limit).map((match, index) => (
            <li key={match.id}>
              <Link
                className="match-card block h-full rounded-panel border border-border bg-card p-5 transition-colors hover:border-accent hover:bg-accent-soft/30"
                href={`${base}/partido/${match.id}`}
              >
                {view === "upcoming" && index === 0 && (
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-accent">
                    {isLiveMatch(match) ? pe.liveMatch : pe.nextMatch}
                  </span>
                )}
                <span className="mono text-xs text-subtle">
                  {new Date(match.date).toLocaleString("es-ES", {
                    timeZone: "Europe/Madrid",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="my-3 flex flex-col gap-2">
                  {[
                    {
                      id: match.homeId,
                      name: match.home,
                      goals: match.homeGoals,
                    },
                    {
                      id: match.awayId,
                      name: match.away,
                      goals: match.awayGoals,
                    },
                  ].map((team) => (
                    <span
                      key={team.id}
                      className="flex items-center gap-3 font-semibold"
                    >
                      {logo(team.id, team.name)}
                      <span className="min-w-0 flex-1 break-words">
                        {team.name}
                      </span>
                      <span className="score shrink-0 text-2xl">
                        {team.goals ?? "—"}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="text-xs text-accent">
                  {match.status === "finished"
                    ? pe.openMatch
                    : isLiveMatch(match)
                      ? pe.liveMatch
                      : match.status === "postponed"
                        ? pe.postponedMatch
                        : ["cancelled", "canceled"].includes(match.status)
                          ? pe.cancelledMatch
                          : pe.notPlayed}{" "}
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {matches.length > limit && (
        <button
          type="button"
          className="mt-4 min-h-11 rounded-control border border-border-strong bg-card px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          onClick={() => setLimit((current) => current + 12)}
        >
          {pe.moreMatches} ({matches.length - limit})
        </button>
      )}
    </section>
  );
}
