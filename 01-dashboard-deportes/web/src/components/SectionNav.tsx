import Link from "next/link";
import { es } from "@/lib/es";
import { SECTIONS, sectionHref, type SectionId } from "@/lib/sections";

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
    <nav aria-label={es.nav.sections}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {SECTIONS.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id}>
              <Link
                href={sectionHref(slug, season, s.id)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-card border px-4 text-sm ${
                  isActive
                    ? "border-accent bg-accent-soft font-medium text-accent"
                    : "border-border bg-card text-fg hover:bg-bg"
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
