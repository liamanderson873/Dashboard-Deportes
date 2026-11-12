export type SectionId = "clasificacion" | "resultados" | "goleadores" | "comparar";

export const SECTIONS: readonly { id: SectionId; path: string }[] = [
  { id: "clasificacion", path: "" },
  { id: "resultados", path: "/resultados" },
  { id: "goleadores", path: "/goleadores" },
  { id: "comparar", path: "/comparar" },
];

export function sectionHref(slug: string, season: number, section: SectionId): string {
  const path = SECTIONS.find((s) => s.id === section)?.path ?? "";
  return `/${slug}/${season}${path}`;
}

export function teamHref(slug: string, season: number, teamId: number): string {
  return `/${slug}/${season}/equipo/${teamId}`;
}
