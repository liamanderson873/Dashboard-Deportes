import Link from "next/link";
import { formatSeason } from "@/lib/competitions";
import { es } from "@/lib/es";

export function SeasonNav({
  slug,
  seasons,
  active,
}: {
  slug: string;
  seasons: number[];
  active: number;
}) {
  return (
    <nav aria-label={es.nav.seasons}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {seasons.map((s) => (
          <li key={s}>
            <Link
              href={`/${slug}/${s}`}
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
