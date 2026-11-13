import Link from "next/link";
import { es } from "@/lib/es";
import { SECTIONS, sectionHref, type SectionId } from "@/lib/sections";

/** Underlined section tabs; the active one is underlined in the accent. */
export function SectionNav({
  slug,
  season,
  active,
}: {
  slug: string;
  season: number;
  active: SectionId | null;
}) {
  return (
    <nav aria-label={es.nav.sections} className="border-b border-border">
      <ul className="scroll-row m-0 -mb-px flex list-none gap-3.5 p-0 min-[430px]:gap-5 sm:gap-6">
        {SECTIONS.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={sectionHref(slug, season, s.id)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-11 items-center whitespace-nowrap border-b-2 text-[0.8125rem] font-medium transition-colors duration-150 min-[430px]:text-sm ${
                  isActive
                    ? "border-accent text-fg"
                    : "border-transparent text-muted hover:border-border-strong hover:text-fg"
                }`}
              >
                {es.sections[s.id]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
