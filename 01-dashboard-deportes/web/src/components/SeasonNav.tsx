import Link from "next/link";
import { formatSeason } from "@/lib/competitions";
import { es } from "@/lib/es";
import { sectionHref, type SectionId } from "@/lib/sections";

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
    <nav aria-label={es.nav.seasons}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {seasons.map((s) => (
          <li key={s}>
            <Link
              href={hrefFor ? hrefFor(s) : sectionHref(slug, s, section)}
              aria-current={s === active ? "page" : undefined}
              className={`num inline-flex min-h-11 items-center rounded-card border px-3 text-sm ${
                s === active
                  ? "border-accent bg-accent-soft font-medium text-accent"
                  : "border-border bg-card text-fg hover:bg-bg"
              }`}
            >
              {formatSeason(s)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
