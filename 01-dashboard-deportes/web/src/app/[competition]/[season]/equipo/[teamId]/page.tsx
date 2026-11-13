import type { Metadata } from "next";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { FormDots } from "@/components/FormDots";
import { KpiCell, KpiStrip } from "@/components/KpiStrip";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LineChart } from "@/components/LineChart";
import { PanelSection } from "@/components/PanelSection";
import { SplitRecord } from "@/components/SplitRecord";
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

function stat(label: string, value: number | null) {
  return value === null
    ? { label, value: es.team.unavailable, unavailable: true }
    : { label, value: formatDecimalEs(value) };
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
      <TeamHeader profile={profile} />

      <PanelSection title={es.team.summary.title}>
        <KpiStrip label={es.team.summary.kpiLabel} columns={6} bare>
          <KpiCell
            label={es.team.summary.position}
            value={position ?? es.team.unavailable}
            highlight={position === 1}
          />
          <KpiCell label={es.team.summary.points} value={total.points} highlight />
          <KpiCell
            label={es.team.summary.record}
            value={`${total.won}-${total.drawn}-${total.lost}`}
          />
          <KpiCell label={es.team.summary.goalsFor} value={total.goalsFor} />
          <KpiCell label={es.team.summary.goalsAgainst} value={total.goalsAgainst} />
          <KpiCell label={es.team.summary.form} value={<FormDots form={form} />} />
        </KpiStrip>
      </PanelSection>

      <PanelSection title={es.team.split.title}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SplitRecord label={es.team.summary.home} record={home} />
          <SplitRecord label={es.team.summary.away} record={away} />
        </div>
      </PanelSection>

      <PanelSection title={evo.title}>
        <div className="rounded-panel border border-border bg-card p-3 sm:p-4">
          <LineChart
            series={chartSeries}
            ariaLabel={evo.chartLabel(profile.name)}
            xLabel={evo.xLabel}
            yLabel={evo.yLabel}
          />
        </div>
        <TeamSeasonsTable rows={seasonRows} />
      </PanelSection>

      <PanelSection title={s.title} note={s.note(stats.matchesWithStats, stats.matchesWithXg)}>
        <StatGrid
          items={[
            stat(s.xgFor, stats.xgFor),
            stat(s.xgAgainst, stats.xgAgainst),
            stat(s.shots, stats.shots),
            stat(s.shotsOnTarget, stats.shotsOnTarget),
            stat(s.corners, stats.corners),
            stat(s.fouls, stats.fouls),
            stat(s.yellow, stats.yellow),
            stat(s.red, stats.red),
          ]}
        />
      </PanelSection>

      <PanelSection
        title={es.team.squad.title}
        note={squad.length === 0 ? undefined : es.team.squad.note(season)}
      >
        {squad.length === 0 ? (
          <p className="rounded-card border border-border bg-card p-4 text-muted">
            {es.team.squad.empty}
          </p>
        ) : (
          <SquadList players={squad} on={new Date(Date.UTC(context.season, 8, 1))} />
        )}
      </PanelSection>

      <PanelSection title={es.team.matches.title}>
        <TeamMatchList
          slug={context.competition.slug}
          season={context.season}
          matches={matches}
        />
      </PanelSection>
    </>
  );
}
