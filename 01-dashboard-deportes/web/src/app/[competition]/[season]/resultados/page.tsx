import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LeagueHeader } from "@/components/LeagueHeader";
import { formatSeason } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { loadLeagueContext } from "@/lib/league-context";
import { defaultMatchday, getMatchdays } from "@/lib/queries/matches";
import { resolveRoute } from "@/lib/route-params";
import { sectionHref } from "@/lib/sections";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ competition: string; season: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competition, season } = await params;
  const route = resolveRoute(competition, season);
  if (!route) return {};
  return { title: `${route.competition.name} ${formatSeason(route.season)} · ${es.sections.resultados}` };
}

export default async function ResultsPage({ params }: Props) {
  const { competition: slug, season: rawSeason } = await params;
  const route = resolveRoute(slug, rawSeason);
  if (!route) notFound();
  if (slug !== route.competition.slug) {
    redirect(`${sectionHref(route.competition.slug, route.season, "resultados")}`);
  }

  const sql = getSql();
  const [context, days] = await Promise.all([
    loadLeagueContext(sql, slug, rawSeason),
    getMatchdays(sql, route.competition.code, route.season),
  ]);

  const target = defaultMatchday(days);
  if (target !== null) {
    redirect(`${sectionHref(slug, context.season, "resultados")}/${target}`);
  }

  return (
    <>
      <LeagueHeader
        context={context}
        section="resultados"
        subtitle={es.results.subtitleNoMatchday(formatSeason(context.season))}
      />
      <EmptyState title={es.results.empty} />
    </>
  );
}
