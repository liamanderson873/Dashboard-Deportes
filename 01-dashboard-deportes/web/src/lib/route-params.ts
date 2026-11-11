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
