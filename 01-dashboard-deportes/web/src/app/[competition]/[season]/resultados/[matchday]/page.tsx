import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LeagueHeader } from "@/components/LeagueHeader";
import { MatchdayNav } from "@/components/MatchdayNav";
import { MatchList } from "@/components/MatchList";
import { formatSeason } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { loadLeagueContext } from "@/lib/league-context";
import { parseMatchday } from "@/lib/matches";
import { getMatchdays, getMatchesByMatchday } from "@/lib/queries/matches";
import { resolveRoute } from "@/lib/route-params";
import { getEnrichedMatchLinks } from "@/lib/queries/players";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ competition: string; season: string; matchday: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competition, season, matchday } = await params;
  const route = resolveRoute(competition, season);
  const day = parseMatchday(matchday);
  if (!route || day === null) return {};
  return {
    title: es.results.pageTitle(
      route.competition.name,
      formatSeason(route.season),
      day,
    ),
  };
}

export default async function MatchdayPage({ params }: Props) {
  const { competition: slug, season: rawSeason, matchday: rawDay } = await params;
  const route = resolveRoute(slug, rawSeason);
  const day = parseMatchday(rawDay);
  if (!route || day === null) notFound();
  if (slug !== route.competition.slug) {
    redirect(`/${route.competition.slug}/${route.season}/resultados/${day}`);
  }

  const sql = getSql();
  const [context, days, matches] = await Promise.all([
    loadLeagueContext(sql, slug, rawSeason),
    getMatchdays(sql, route.competition.code, route.season),
    getMatchesByMatchday(sql, route.competition.code, route.season, day),
  ]);
  if (!days.some((d) => d.matchday === day)) notFound();
  const detailLinks = await getEnrichedMatchLinks(sql, route.competition.code, route.season);

  return (
    <>
      <LeagueHeader
        context={context}
        section="resultados"
        subtitle={es.results.subtitle(formatSeason(context.season), day)}
      />
      <MatchdayNav
        slug={context.competition.slug}
        season={context.season}
        days={days}
        active={day}
      />
      <MatchList
        slug={context.competition.slug}
        season={context.season}
        matches={matches}
        detailLinks={detailLinks}
      />
    </>
  );
}
