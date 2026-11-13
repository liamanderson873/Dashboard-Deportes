import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ACTION_SECONDARY, EmptyState } from "@/components/EmptyState";
import { KpiCell, KpiStrip } from "@/components/KpiStrip";
import { LeagueHeader } from "@/components/LeagueHeader";
import { StandingsLegend, StandingsTable } from "@/components/StandingsTable";
import { TeamCrest } from "@/components/TeamCrest";
import { formatSeason } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { loadLeagueContext } from "@/lib/league-context";
import { getStandings } from "@/lib/queries/standings";
import { formatDecimalEs, resolveRoute } from "@/lib/route-params";
import { sectionHref } from "@/lib/sections";
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

function KpiTeam({ row }: { row: StandingRow }) {
  const name = row.shortName || row.team;
  return (
    <>
      <TeamCrest crest={row.crest} tla={row.tla} size={24} />
      <span className="min-w-0 truncate" title={row.team || name}>
        {name}
      </span>
    </>
  );
}

export default async function StandingsPage({ params }: Props) {
  const { competition: slug, season: rawSeason } = await params;
  const route = resolveRoute(slug, rawSeason);
  if (!route) notFound();
  if (slug !== route.competition.slug) {
    redirect(`/${route.competition.slug}/${route.season}`);
  }

  const sql = getSql();
  const [context, rows] = await Promise.all([
    loadLeagueContext(sql, slug, rawSeason),
    getStandings(sql, route.competition.code, route.season),
  ]);

  const seasonLabel = formatSeason(context.season);
  const summary = summarize(rows);

  return (
    <>
      <LeagueHeader
        context={context}
        section="clasificacion"
        subtitle={es.standings.subtitle(seasonLabel, summary?.matchesPlayed ?? 0)}
      />

      {summary ? (
        <>
          <KpiStrip label={es.kpi.title}>
            <KpiCell
              label={es.kpi.leader}
              team={<KpiTeam row={summary.leader} />}
              value={`${summary.leader.points}`}
              unit={es.kpi.units.points}
              highlight
            />
            <KpiCell
              label={es.kpi.bestAttack}
              team={<KpiTeam row={summary.bestAttack} />}
              value={`${summary.bestAttack.goalsFor}`}
              unit={es.kpi.units.goals}
            />
            <KpiCell
              label={es.kpi.bestDefense}
              team={<KpiTeam row={summary.bestDefense} />}
              value={`${summary.bestDefense.goalsAgainst}`}
              unit={es.kpi.units.goalsAgainst}
            />
            <KpiCell
              label={es.kpi.goalsPerMatch}
              team={<span className="font-medium text-muted">{es.kpi.leagueAverage}</span>}
              value={formatDecimalEs(summary.goalsPerMatch)}
              unit={es.kpi.units.perMatch}
            />
          </KpiStrip>
          <StandingsTable
            slug={context.competition.slug}
            season={context.season}
            rows={rows}
            caption={es.standings.caption(context.competition.name, seasonLabel)}
          />
          <StandingsLegend showZones={rows.length >= 10} />
        </>
      ) : (
        <EmptyState
          title={es.empty.noFinishedMatches}
          action={
            <Link
              href={sectionHref(context.competition.slug, context.season, "resultados")}
              className={ACTION_SECONDARY}
            >
              {es.empty.seeResults}
            </Link>
          }
        >
          <p>{es.empty.noFinishedMatchesHint}</p>
        </EmptyState>
      )}
    </>
  );
}
