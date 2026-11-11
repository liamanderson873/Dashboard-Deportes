import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompareForm } from "@/components/CompareForm";
import { CompareTable } from "@/components/CompareTable";
import { LeagueHeader } from "@/components/LeagueHeader";
import { MatchList } from "@/components/MatchList";
import { buildCompareRows, parseSelection } from "@/lib/compare";
import { formatSeason } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { loadLeagueContext } from "@/lib/league-context";
import { getHeadToHead } from "@/lib/queries/head-to-head";
import { getStandings } from "@/lib/queries/standings";
import { getAdvancedStats } from "@/lib/queries/team";
import { resolveRoute } from "@/lib/route-params";
import { sectionHref } from "@/lib/sections";

export const dynamic = "force-dynamic";

type Query = Record<string, string | string[] | undefined>;
type Props = {
  params: Promise<{ competition: string; season: string }>;
  searchParams: Promise<Query>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competition, season } = await params;
  const route = resolveRoute(competition, season);
  if (!route) return {};
  return {
    title: es.compare.pageTitle(route.competition.name, formatSeason(route.season)),
  };
}

function withQuery(path: string, query: Query): string {
  const qs = new URLSearchParams();
  for (const key of ["a", "b"]) {
    const raw = query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined) qs.set(key, value);
  }
  const text = qs.toString();
  return text ? `${path}?${text}` : path;
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { competition: slug, season: rawSeason } = await params;
  const query = await searchParams;
  const route = resolveRoute(slug, rawSeason);
  if (!route) notFound();
  if (slug !== route.competition.slug) {
    redirect(
      withQuery(sectionHref(route.competition.slug, route.season, "comparar"), query),
    );
  }

  const sql = getSql();
  const [context, standings] = await Promise.all([
    loadLeagueContext(sql, slug, rawSeason),
    getStandings(sql, route.competition.code, route.season),
  ]);
  const teams = standings
    .map((r) => ({ id: r.teamId, name: r.team }))
    .sort((x, y) => x.name.localeCompare(y.name, "es"));
  const selection = parseSelection(
    query.a,
    query.b,
    teams.map((t) => t.id),
  );
  const rowA = standings.find((r) => r.teamId === selection.a);
  const rowB = standings.find((r) => r.teamId === selection.b);
  const { code } = route.competition;

  const comparison =
    rowA && rowB
      ? await Promise.all([
          getAdvancedStats(sql, code, route.season, rowA.teamId),
          getAdvancedStats(sql, code, route.season, rowB.teamId),
          getHeadToHead(sql, code, rowA.teamId, rowB.teamId),
        ])
      : null;

  const message = selection.error
    ? es.compare.errors[selection.error]
    : comparison
      ? null
      : es.compare.hint;

  return (
    <>
      <LeagueHeader
        context={context}
        section="comparar"
        subtitle={es.compare.subtitle(formatSeason(context.season))}
      />
      <CompareForm
        slug={context.competition.slug}
        season={context.season}
        teams={teams}
        a={selection.a}
        b={selection.b}
      />
      {message ? (
        <p role="status" className="mt-4 text-muted">
          {message}
        </p>
      ) : null}
      {rowA && rowB && comparison ? (
        <>
          <div className="mt-6">
            <CompareTable
              a={rowA}
              b={rowB}
              rows={buildCompareRows(
                { row: rowA, adv: comparison[0] },
                { row: rowB, adv: comparison[1] },
              )}
            />
          </div>
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">{es.compare.headToHead.title}</h2>
            {comparison[2].length === 0 ? (
              <p className="text-muted">{es.compare.headToHead.empty}</p>
            ) : (
              <MatchList
                slug={context.competition.slug}
                season={context.season}
                matches={comparison[2]}
              />
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
