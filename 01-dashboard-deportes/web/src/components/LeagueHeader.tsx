import type { LeagueContext } from "@/lib/league-context";
import type { SectionId } from "@/lib/sections";
import { LeagueNav } from "./LeagueNav";
import { SeasonNav } from "./SeasonNav";
import { SectionNav } from "./SectionNav";

export function LeagueHeader({
  context,
  section,
  title,
  subtitle,
}: {
  context: LeagueContext;
  section: SectionId | null;
  title?: string;
  subtitle: string;
}) {
  const { competition, season, seasons, seasonsByCompetition } = context;
  const navSection = section ?? "clasificacion";
  return (
    <>
      <header className="mb-6">
        <h1 className="text-[32px] font-extrabold leading-tight">
          {title ?? competition.name}
        </h1>
        <p className="num mt-1 text-muted">{subtitle}</p>
      </header>
      <div className="mb-6 flex flex-col gap-3">
        <LeagueNav
          activeSlug={competition.slug}
          season={season}
          section={navSection}
          seasonsByCompetition={seasonsByCompetition}
        />
        <SeasonNav
          slug={competition.slug}
          seasons={seasons}
          active={season}
          section={navSection}
        />
        <SectionNav slug={competition.slug} season={season} active={section} />
      </div>
    </>
  );
}
