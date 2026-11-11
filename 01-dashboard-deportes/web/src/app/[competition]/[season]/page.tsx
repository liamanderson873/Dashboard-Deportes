import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { LeagueNav } from "@/components/LeagueNav";
import { SeasonNav } from "@/components/SeasonNav";
import { StandingsTable } from "@/components/StandingsTable";
import { TeamCrest } from "@/components/TeamCrest";
import { formatSeason } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { getAvailableSeasons, getStandings } from "@/lib/queries/standings";
import { formatDecimalEs, resolveRoute } from "@/lib/route-params";
import { summarize, type StandingRow } from "@/lib/standings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ competition: string; season: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competition, season } = await params;
  const route = resolveRoute(competition, season);
  if (!route) return {};
  return {
    title: es.standings.pageTitle(route.competition.name, formatSeason(route.season)),
  };
}

function TeamValue({ row, value }: { row: StandingRow; value: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamCrest crest={row.crest} tla={row.tla} size={24} />
      <span className="min-w-0 truncate">
        {row.shortName || row.team} <span className="num text-muted">{value}</span>
      </span>
    </span>
  );
}

export default async function StandingsPage({ params }: Props) {
  const { competition: slug, season: rawSeason } = await params;
  const route = resolveRoute(slug, rawSeason);
  if (!route) notFound();

  const sql = getSql();
  const [rows, seasons] = await Promise.all([
    getStandings(sql, route.competition.code, route.season),
    getAvailableSeasons(sql, route.competition.code),
  ]);
  if (!seasons.includes(route.season)) notFound();

  const seasonLabel = formatSeason(route.season);
  const summary = summarize(rows);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[32px] font-extrabold leading-tight">
          {route.competition.name}
        </h1>
        <p className="num mt-1 text-muted">
          {es.standings.subtitle(seasonLabel, summary?.matchesPlayed ?? 0)}
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3">
        <LeagueNav activeSlug={route.competition.slug} season={route.season} />
        <SeasonNav
          slug={route.competition.slug}
          seasons={seasons}
          active={route.season}
        />
      </div>

      {summary ? (
        <>
          <section className="mb-6 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
            <KpiCard label={es.kpi.leader}>
              <TeamValue row={summary.leader} value={`${summary.leader.points}`} />
            </KpiCard>
            <KpiCard label={es.kpi.bestAttack}>
              <TeamValue
                row={summary.bestAttack}
                value={`${summary.bestAttack.goalsFor}`}
              />
            </KpiCard>
            <KpiCard label={es.kpi.bestDefense}>
              <TeamValue
                row={summary.bestDefense}
                value={`${summary.bestDefense.goalsAgainst}`}
              />
            </KpiCard>
            <KpiCard label={es.kpi.goalsPerMatch}>
              <span className="num">{formatDecimalEs(summary.goalsPerMatch)}</span>
            </KpiCard>
          </section>
          <StandingsTable
            rows={rows}
            caption={es.standings.caption(route.competition.name, seasonLabel)}
          />
          <p className="mt-4 text-sm text-muted">{es.standings.legend}</p>
        </>
      ) : (
        <EmptyState title={es.empty.noFinishedMatches} />
      )}
    </>
  );
}
