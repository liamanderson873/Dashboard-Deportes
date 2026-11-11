import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LeagueHeader } from "@/components/LeagueHeader";
import { ScorersTable } from "@/components/ScorersTable";
import { formatSeason } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { loadLeagueContext } from "@/lib/league-context";
import { getScorers } from "@/lib/queries/scorers";
import { resolveRoute } from "@/lib/route-params";
import { sectionHref } from "@/lib/sections";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ competition: string; season: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competition, season } = await params;
  const route = resolveRoute(competition, season);
  if (!route) return {};
  return {
    title: es.scorers.pageTitle(route.competition.name, formatSeason(route.season)),
  };
}

export default async function ScorersPage({ params }: Props) {
  const { competition: slug, season: rawSeason } = await params;
  const route = resolveRoute(slug, rawSeason);
  if (!route) notFound();
  if (slug !== route.competition.slug) {
    redirect(sectionHref(route.competition.slug, route.season, "goleadores"));
  }

  const sql = getSql();
  const [context, rows] = await Promise.all([
    loadLeagueContext(sql, slug, rawSeason),
    getScorers(sql, route.competition.code, route.season),
  ]);
  const season = formatSeason(context.season);

  return (
    <>
      <LeagueHeader
        context={context}
        section="goleadores"
        subtitle={es.scorers.subtitle(season)}
      />
      {rows.length === 0 ? (
        <EmptyState title={es.scorers.empty} />
      ) : (
        <>
          <ScorersTable
            slug={context.competition.slug}
            season={context.season}
            rows={rows}
            caption={es.scorers.caption(context.competition.name, season)}
          />
          <p className="mt-4 text-sm text-muted">{es.scorers.source}</p>
        </>
      )}
    </>
  );
}
