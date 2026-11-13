import Link from "next/link";
import { formatSeason } from "@/lib/competitions";
import { es } from "@/lib/es";
import { sectionHref, type SectionId } from "@/lib/sections";

/** Compact segmented control of season links. */
export function SeasonNav({
  slug,
  seasons,
  active,
  section = "clasificacion",
  hrefFor,
}: {
  slug: string;
  seasons: number[];
  active: number;
  section?: SectionId;
  hrefFor?: (season: number) => string;
}) {
  return (
    <nav aria-label={es.nav.seasons} className="min-w-0 max-w-full shrink-0">
      <ul className="scroll-row m-0 inline-flex max-w-full list-none gap-0.5 rounded-control border border-border bg-card p-0.5">
        {seasons.map((s) => {
          const isActive = s === active;
          return (
            <li key={s} className="shrink-0">
              <Link
                href={hrefFor ? hrefFor(s) : sectionHref(slug, s, section)}
                aria-current={isActive ? "page" : undefined}
                className={`num inline-flex h-10 items-center rounded-[6px] px-3 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                {formatSeason(s)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
