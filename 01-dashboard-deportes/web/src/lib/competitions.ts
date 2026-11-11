export type CompetitionCode = "PD" | "PL" | "SA" | "BL1" | "FL1";

export type Competition = {
  code: CompetitionCode;
  slug: string;
  name: string;
  country: string;
};

export const COMPETITIONS: readonly Competition[] = [
  { code: "PD", slug: "pd", name: "LaLiga", country: "España" },
  { code: "PL", slug: "pl", name: "Premier League", country: "Inglaterra" },
  { code: "SA", slug: "sa", name: "Serie A", country: "Italia" },
  { code: "BL1", slug: "bl1", name: "Bundesliga", country: "Alemania" },
  { code: "FL1", slug: "fl1", name: "Ligue 1", country: "Francia" },
];

export function competitionBySlug(slug: string): Competition | undefined {
  const wanted = slug.toLowerCase();
  return COMPETITIONS.find((c) => c.slug === wanted);
}

/** 2026 -> "2026-27"; 2099 -> "2099-00". */
export function formatSeason(startYear: number): string {
  const end = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${end}`;
}

/** Four-digit integer year between 2000 and 2100, otherwise null. */
export function parseSeason(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 2000 && year <= 2100 ? year : null;
}
