import { notFound } from "next/navigation";
import type { Sql } from "postgres";
import type { Competition, CompetitionCode } from "@/lib/competitions";
import {
  getAvailableSeasons,
  getSeasonsByCompetition,
} from "@/lib/queries/standings";
import { resolveRoute } from "@/lib/route-params";

export type LeagueContext = {
  competition: Competition;
  season: number;
  seasons: number[];
  seasonsByCompetition: Partial<Record<CompetitionCode, number[]>>;
};

/** Validates the route and loads what the shared header needs; 404s otherwise. */
export async function loadLeagueContext(
  sql: Sql,
  slug: string,
  rawSeason: string,
): Promise<LeagueContext> {
  const route = resolveRoute(slug, rawSeason);
  if (!route) notFound();
  const [seasons, seasonsByCompetition] = await Promise.all([
    getAvailableSeasons(sql, route.competition.code),
    getSeasonsByCompetition(sql),
  ]);
  if (!seasons.includes(route.season)) notFound();
  return { ...route, seasons, seasonsByCompetition };
}
