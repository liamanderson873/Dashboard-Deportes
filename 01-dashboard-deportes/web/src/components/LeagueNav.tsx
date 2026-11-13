import Link from "next/link";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { es } from "@/lib/es";
import { targetSeason } from "@/lib/route-params";
import { sectionHref, type SectionId } from "@/lib/sections";

// Text tabs on the ink band; the active one carries a 2px green underline.
const TAB =
  "inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors duration-150";

export function LeagueNav({
  activeSlug,
  season,
  section = "clasificacion",
  seasonsByCompetition,
}: {
  activeSlug: string;
  season: number;
  section?: SectionId;
  seasonsByCompetition: Partial<Record<CompetitionCode, number[]>>;
}) {
  return (
    <nav aria-label={es.nav.leagues}>
      <ul className="scroll-row scroll-fade m-0 -ml-3 flex list-none p-0 md:ml-0 md:-mr-3">
        {COMPETITIONS.map((c) => {
          const active = c.slug === activeSlug;
          const target = targetSeason(seasonsByCompetition[c.code], season);
          if (target === null) {
            return (
              <li key={c.code} className="shrink-0">
                <span
                  aria-disabled="true"
                  title={es.nav.leagueWithoutData}
                  className={`${TAB} cursor-not-allowed border-transparent text-on-ink-muted opacity-60`}
                >
                  {c.name}
                  <span className="sr-only"> ({es.nav.leagueWithoutData})</span>
                </span>
              </li>
            );
          }
          return (
            <li key={c.code} className="shrink-0">
              <Link
                href={sectionHref(c.slug, target, section)}
                aria-current={active ? "page" : undefined}
                className={`${TAB} ${
                  active
                    ? "border-accent text-on-ink"
                    : "border-transparent text-on-ink-muted hover:text-on-ink"
                }`}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
