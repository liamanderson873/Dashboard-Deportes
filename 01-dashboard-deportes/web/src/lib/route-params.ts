import { competitionBySlug, parseSeason, type Competition } from "@/lib/competitions";

/** Validates the dynamic segments of /{competition}/{season}. */
export function resolveRoute(
  slug: string,
  season: string,
): { competition: Competition; season: number } | null {
  const competition = competitionBySlug(slug);
  const year = parseSeason(season);
  if (!competition || year === null) return null;
  return { competition, season: year };
}

/** 2.666 -> "2,67": always two decimals, comma separator (es-ES). */
export function formatDecimalEs(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/** Season a league chip links to: the current one if the league has it, else its latest, else null. */
export function targetSeason(
  seasons: readonly number[] | undefined,
  current: number,
): number | null {
  if (!seasons || seasons.length === 0) return null;
  return seasons.includes(current) ? current : Math.max(...seasons);
}
