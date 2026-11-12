import type { Metadata } from "next";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { FormDots } from "@/components/FormDots";
import { KpiCard } from "@/components/KpiCard";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LineChart } from "@/components/LineChart";
import { SquadList } from "@/components/SquadList";
import { StatGrid } from "@/components/StatGrid";
import { TeamHeader } from "@/components/TeamHeader";
import { TeamMatchList } from "@/components/TeamMatchList";
import { TeamSeasonsTable, type TeamSeasonRow } from "@/components/TeamSeasonsTable";
import type { Series } from "@/lib/chart";
import { formatSeason } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { loadLeagueContext } from "@/lib/league-context";
import { getStandings } from "@/lib/queries/standings";
import {
  getAdvancedStats,
  getSquad,
  getTeamMatches,
  getTeamProfile,
  getTeamSeasons,
} from "@/lib/queries/team";
import { formatDecimalEs, resolveRoute } from "@/lib/route-params";
import { teamHref } from "@/lib/sections";
import type { Result } from "@/lib/standings";
import { parseTeamId, pointsProgression, splitRecord, toTeamMatches } from "@/lib/team";

export const dynamic = "force-dynamic";

// One profile query per request, shared by generateMetadata and the page.
const loadProfile = cache(getTeamProfile);

type Props = {
  params: Promise<{ competition: string; season: string; teamId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competition, season, teamId } = await params;
  const route = resolveRoute(competition, season);
  const id = parseTeamId(teamId);
  if (!route || id === null) return {};
  const profile = await loadProfile(getSql(), id);
  if (!profile) return {};
  return {
    title: es.team.pageTitle(
      profile.name,
      route.competition.name,
      formatSeason(route.season),
    ),
  };
}

function decimal(value: number | null): string {
  return value === null ? es.team.unavailable : formatDecimalEs(value);
}

export default async function TeamPage({ params }: Props) {
  const { competition: slug, season: rawSeason, teamId: rawTeamId } = await params;
  const route = resolveRoute(slug, rawSeason);
  const teamId = parseTeamId(rawTeamId);
  if (!route || teamId === null) notFound();
  if (slug !== route.competition.slug) {
    redirect(teamHref(route.competition.slug, route.season, teamId));
  }

  const sql = getSql();
  const { code } = route.competition;
  const [context, profile, teamSeasons, rawMatches, standings, squad, stats] =
    await Promise.all([
      loadLeagueContext(sql, slug, rawSeason),
      loadProfile(sql, teamId),
      getTeamSeasons(sql, code, teamId),
      getTeamMatches(sql, code, route.season, teamId),
      getStandings(sql, code, route.season),
      getSquad(sql, route.season, teamId),
      getAdvancedStats(sql, code, route.season, teamId),
    ]);
  if (!profile || rawMatches.length === 0) notFound();

  const matches = toTeamMatches(rawMatches, teamId);
  const total = splitRecord(matches, "all");
  const home = splitRecord(matches, "home");
  const away = splitRecord(matches, "away");
  const form: Result[] = matches
    .map((t) => t.result)
    .filter((r): r is Result => r !== null)
    .slice(-5);
  const position = standings.find((r) => r.teamId === teamId)?.position ?? null;
  const season = formatSeason(context.season);
  const s = es.team.stats;

  const evo = es.team.evolution;
  const perSeason = await Promise.all(
    teamSeasons.map(async (y) => {
      if (y === context.season) return { y, matches, standings };
      const [raw, table] = await Promise.all([
        getTeamMatches(sql, code, y, teamId),
        getStandings(sql, code, y),
      ]);
      return { y, matches: toTeamMatches(raw, teamId), standings: table };
    }),
  );
  const chartSeries: Series[] = perSeason
    .map(({ y, matches: tm }) => ({
      id: String(y),
      label: formatSeason(y),
      highlight: y === context.season,
      points: pointsProgression(tm).map((p, i) => ({ x: i + 1, y: p.cumulative })),
    }))
    .filter((sr) => sr.points.length > 0);
  const seasonRows: TeamSeasonRow[] = perSeason.map(({ y, standings: table }) => {
    const r = table.find((t) => t.teamId === teamId);
    return {
      season: y,
      label: formatSeason(y),
      href: teamHref(context.competition.slug, y, teamId),
      current: y === context.season,
      position: r?.position ?? null,
      played: r?.played ?? null,
      points: r?.points ?? null,
      goalsFor: r?.goalsFor ?? null,
      goalsAgainst: r?.goalsAgainst ?? null,
    };
  });

  return (
    <>
      <LeagueHeader
        context={context}
        section={null}
        title={profile.name}
        subtitle={es.team.subtitle(context.competition.name, season)}
        seasonNav={{
          seasons: teamSeasons,
          hrefFor: (y) => teamHref(context.competition.slug, y, teamId),
        }}
      />
      <div className="flex flex-col gap-8">
        <TeamHeader profile={profile} />

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{es.team.summary.title}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard label={es.team.summary.position}>
              <span className="num">{position ?? es.team.unavailable}</span>
            </KpiCard>
            <KpiCard label={es.team.summary.points}>
              <span className="num">{total.points}</span>
            </KpiCard>
            <KpiCard label={es.team.summary.record}>
              <span className="num">
                {total.won}-{total.drawn}-{total.lost}
              </span>
            </KpiCard>
            <KpiCard label={es.team.summary.goalsFor}>
              <span className="num">{total.goalsFor}</span>
            </KpiCard>
            <KpiCard label={es.team.summary.goalsAgainst}>
              <span className="num">{total.goalsAgainst}</span>
            </KpiCard>
            <KpiCard label={es.team.summary.form}>
              <FormDots form={form} />
            </KpiCard>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <KpiCard label={es.team.summary.home}>
              <span className="num text-base">
                {es.team.summary.split(
                  home.played,
                  home.won,
                  home.drawn,
                  home.lost,
                  home.goalsFor,
                  home.goalsAgainst,
                  home.points,
                )}
              </span>
            </KpiCard>
            <KpiCard label={es.team.summary.away}>
              <span className="num text-base">
                {es.team.summary.split(
                  away.played,
                  away.won,
                  away.drawn,
                  away.lost,
                  away.goalsFor,
                  away.goalsAgainst,
                  away.points,
                )}
              </span>
            </KpiCard>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{evo.title}</h2>
          <div className="rounded-panel border border-border bg-card p-4">
            <LineChart
              series={chartSeries}
              ariaLabel={evo.chartLabel(profile.name)}
              xLabel={evo.xLabel}
              yLabel={evo.yLabel}
            />
          </div>
          <TeamSeasonsTable rows={seasonRows} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{s.title}</h2>
          <StatGrid
            items={[
              { label: s.xgFor, value: decimal(stats.xgFor) },
              { label: s.xgAgainst, value: decimal(stats.xgAgainst) },
              { label: s.shots, value: decimal(stats.shots) },
              { label: s.shotsOnTarget, value: decimal(stats.shotsOnTarget) },
              { label: s.corners, value: decimal(stats.corners) },
              { label: s.fouls, value: decimal(stats.fouls) },
              { label: s.yellow, value: decimal(stats.yellow) },
              { label: s.red, value: decimal(stats.red) },
            ]}
          />
          <p className="text-sm text-muted">
            {s.note(stats.matchesWithStats, stats.matchesWithXg)}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{es.team.squad.title}</h2>
          {squad.length === 0 ? (
            <p className="rounded-card border border-border bg-card p-4 text-muted">
              {es.team.squad.empty}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">{es.team.squad.note(season)}</p>
              <SquadList players={squad} on={new Date(Date.UTC(context.season, 8, 1))} />
            </>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{es.team.matches.title}</h2>
          <TeamMatchList
            slug={context.competition.slug}
            season={context.season}
            matches={matches}
          />
        </section>
      </div>
    </>
  );
}
