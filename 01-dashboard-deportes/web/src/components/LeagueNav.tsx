import Link from "next/link";
import { COMPETITIONS } from "@/lib/competitions";
import { es } from "@/lib/es";

export function LeagueNav({
  activeSlug,
  season,
}: {
  activeSlug: string;
  season: number;
}) {
  return (
    <nav aria-label={es.nav.leagues}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {COMPETITIONS.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.code}>
              <Link
                href={`/${c.slug}/${season}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${
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
