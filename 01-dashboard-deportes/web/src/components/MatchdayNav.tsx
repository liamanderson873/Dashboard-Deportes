import Link from "next/link";
import { es } from "@/lib/es";
import type { MatchdaySummary } from "@/lib/queries/matches";
import { sectionHref } from "@/lib/sections";

const linkBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-card border px-3 text-sm";

export function MatchdayNav({
  slug,
  season,
  days,
  active,
}: {
  slug: string;
  season: number;
  days: MatchdaySummary[];
  active: number;
}) {
  const numbers = days.map((d) => d.matchday);
  const index = numbers.indexOf(active);
  const prev = index > 0 ? numbers[index - 1] : null;
  const next = index >= 0 && index < numbers.length - 1 ? numbers[index + 1] : null;
  const href = (n: number) => `${sectionHref(slug, season, "resultados")}/${n}`;

  return (
    <nav aria-label={es.results.matchdayNav} className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {prev !== null ? (
          <Link
            href={href(prev)}
            className={`${linkBase} border-border bg-card text-fg hover:bg-bg`}
          >
            {es.results.previous}
          </Link>
        ) : (
          <span />
        )}
        {next !== null ? (
          <Link
            href={href(next)}
            className={`${linkBase} border-border bg-card text-fg hover:bg-bg`}
          >
            {es.results.next}
          </Link>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {numbers.map((n) => {
          const isActive = n === active;
          return (
            <li key={n}>
              <Link
                href={href(n)}
                aria-current={isActive ? "page" : undefined}
                aria-label={es.results.matchdayLabel(n)}
                className={`${linkBase} num ${
                  isActive
                    ? "border-accent bg-accent-soft font-medium text-accent"
                    : "border-border bg-card text-fg hover:bg-bg"
                }`}
              >
                {n}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
