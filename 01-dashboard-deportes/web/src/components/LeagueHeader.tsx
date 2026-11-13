import type { LeagueContext } from "@/lib/league-context";
import type { SectionId } from "@/lib/sections";
import { LeagueNav } from "./LeagueNav";
import { SeasonNav } from "./SeasonNav";
import { SectionNav } from "./SectionNav";
import { SiteBand } from "./SiteBand";

/**
 * Shell of every league page: the ink band with the league tabs, the page
 * header (the page's only h1, subtitle and season control) and the section tabs.
 */
export function LeagueHeader({
  context,
  section,
  title,
  subtitle,
  seasonNav,
}: {
  context: LeagueContext;
  section: SectionId | null;
  title?: string;
  subtitle: string;
  /** Overrides the season links (the team page keeps the same team). */
  seasonNav?: { seasons: number[]; hrefFor: (season: number) => string };
}) {
  const { competition, season, seasons, seasonsByCompetition } = context;
  const navSection = section ?? "clasificacion";
  return (
    <>
      <SiteBand>
        <LeagueNav
          activeSlug={competition.slug}
          season={season}
          section={navSection}
          seasonsByCompetition={seasonsByCompetition}
        />
      </SiteBand>
      <header
        id="contenido"
        className="flex scroll-mt-28 flex-col gap-4 pb-5 pt-6 md:flex-row md:items-end md:justify-between md:gap-8 md:pt-8"
      >
        <div className="min-w-0">
          <h1 className="display break-words text-[2.25rem] font-extrabold tracking-[-0.01em] text-fg md:text-[2.75rem] lg:text-5xl">
            {title ?? competition.name}
          </h1>
          <p className="num mt-2 text-[0.9375rem] text-muted">{subtitle}</p>
        </div>
        <SeasonNav
          slug={competition.slug}
          seasons={seasonNav?.seasons ?? seasons}
          active={season}
          section={navSection}
          hrefFor={seasonNav?.hrefFor}
        />
      </header>
      <div className="mb-6">
        <SectionNav slug={competition.slug} season={season} active={section} />
      </div>
    </>
  );
}
