import Link from "next/link";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { es } from "@/lib/es";
import { targetSeason } from "@/lib/route-params";
import { sectionHref, type SectionId } from "@/lib/sections";

const CHIP =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium";

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
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {COMPETITIONS.map((c) => {
          const active = c.slug === activeSlug;
          const target = targetSeason(seasonsByCompetition[c.code], season);
          if (target === null) {
            return (
              <li key={c.code}>
                <span
                  aria-disabled="true"
                  title={es.nav.leagueWithoutData}
                  className={`${CHIP} border-border bg-bg text-muted`}
                >
                  {c.name}
                  <span className="sr-only"> ({es.nav.leagueWithoutData})</span>
                </span>
              </li>
            );
          }
          return (
            <li key={c.code}>
              <Link
                href={sectionHref(c.slug, target, section)}
                aria-current={active ? "page" : undefined}
                className={`${CHIP} ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-card text-fg hover:bg-bg"
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
