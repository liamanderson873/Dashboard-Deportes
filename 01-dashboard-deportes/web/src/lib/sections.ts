export type SectionId = "clasificacion" | "resultados" | "goleadores" | "comparar" | "jugadores" | "partidos" | "seguimiento" | "mi-once";

export const SECTIONS: readonly { id: SectionId; path: string }[] = [
  { id: "clasificacion", path: "" },
  { id: "resultados", path: "/resultados" },
  { id: "goleadores", path: "/goleadores" },
  { id: "comparar", path: "/comparar" },
  { id: "jugadores", path: "/jugadores" },
  { id: "partidos", path: "/partidos" },
  { id: "seguimiento", path: "/seguimiento" },
  { id: "mi-once", path: "/mi-once" },
];

export function primarySection(section: SectionId | null) {
  if (section === 'resultados' || section === 'partidos') return 'partidos';
  if (section === 'jugadores' || section === 'seguimiento' || section === 'mi-once') return section;
  return 'liga';
}

export function sectionHref(slug: string, season: number, section: SectionId): string {
  const path = SECTIONS.find((s) => s.id === section)?.path ?? "";
  return `/${slug}/${season}${path}`;
}

export function teamHref(slug: string, season: number, teamId: number): string {
  return `/${slug}/${season}/equipo/${teamId}`;
}
