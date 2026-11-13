import Link from "next/link";
import { es } from "@/lib/es";
import type { MatchdaySummary } from "@/lib/queries/matches";
import { sectionHref } from "@/lib/sections";

const STEP =
  "inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-card px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-2";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={dir === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
    </svg>
  );
}

/** Previous/next steppers plus a compact grid of matchday numbers. */
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
    <nav aria-label={es.results.matchdayNav} className="mb-8 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        {prev !== null ? (
          <Link href={href(prev)} className={STEP}>
            <Chevron dir="left" />
            {es.results.previous}
          </Link>
        ) : (
          <span />
        )}
        <span className="display hidden text-[1.25rem] font-bold text-fg sm:inline" aria-hidden="true">
          {es.results.matchdayLabel(active)}
        </span>
        {next !== null ? (
          <Link href={href(next)} className={STEP}>
            {es.results.next}
            <Chevron dir="right" />
          </Link>
        ) : (
          <span />
        )}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {numbers.map((n) => {
          const isActive = n === active;
          return (
            <li key={n}>
              <Link
                href={href(n)}
                aria-current={isActive ? "page" : undefined}
                aria-label={es.results.matchdayLabel(n)}
                className={`num inline-flex size-9 items-center justify-center rounded-control border text-[0.8125rem] font-medium transition-colors duration-150 ${
                  isActive
                    ? "border-accent bg-accent font-bold text-white"
                    : "border-border bg-card text-fg hover:border-border-strong hover:bg-surface-2"
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
