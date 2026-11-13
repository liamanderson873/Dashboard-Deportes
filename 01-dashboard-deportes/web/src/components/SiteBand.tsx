import Link from "next/link";
import type { ReactNode } from "react";
import { es } from "@/lib/es";
import { SportNav } from "./SportNav";

/** Centre circle of a pitch: the app mark. Decorative. */
function BrandMark({ sport }: { sport: "football" | "nba" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="shrink-0"
    >
      {sport === "nba" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18M5.5 5.5c8 3 8 10 0 13m13-13c-8 3-8 10 0 13" />
        </>
      ) : (
        <>
          <rect x="2" y="4" width="20" height="16" rx="1.5" />
          <path d="M12 4v16" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

/**
 * Sticky ink band at the top of every page: the brand and, on pages with a
 * league context, the league tabs (passed as children).
 */
export function SiteBand({
  children,
  sport = "football",
}: {
  children?: ReactNode;
  sport?: "football" | "nba";
}) {
  return (
    <div
      data-sport={sport}
      className="site-band on-ink full-bleed sticky top-0 z-30 bg-ink px-4 text-on-ink shadow-[0_1px_0_var(--border)] sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex min-h-14 items-center justify-between gap-5 md:justify-start">
          <Link
            href="/"
            aria-label={es.brandHome}
            className="flex min-h-11 shrink-0 items-center gap-2.5 self-start text-on-ink md:self-auto"
          >
            <BrandMark sport={sport} />
            <span className="display text-[1.0625rem] font-bold tracking-[0.01em]">
              {es.appTitle}
            </span>
          </Link>
          <SportNav active={sport} />
        </div>
        {children ? (
          <div className="-mx-4 min-w-0 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
