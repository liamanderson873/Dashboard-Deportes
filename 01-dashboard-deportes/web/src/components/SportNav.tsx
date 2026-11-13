import Link from "next/link";
export function SportNav({
  active = "football",
}: {
  active?: "football" | "nba";
}) {
  return (
    <nav
      aria-label="Deportes"
      className="sport-switch flex gap-1 rounded-full border border-on-ink/20 p-1"
    >
      {[
        ["football", "Fútbol", "/"],
        ["nba", "NBA", "/nba"],
      ].map(([id, label, href]) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? "location" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors ${active === id ? "bg-on-ink text-ink" : "text-on-ink-muted hover:text-on-ink"}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {id === "nba" ? (
              <>
                <circle cx="10" cy="10" r="8" />
                <path d="M2 10h16M10 2v16M4 4c7 3 7 9 0 12m12-12c-7 3-7 9 0 12" />
              </>
            ) : (
              <>
                <rect x="2" y="3" width="16" height="14" rx="1" />
                <path d="M10 3v14" />
                <circle cx="10" cy="10" r="3" />
              </>
            )}
          </svg>
          {label}
        </Link>
      ))}
    </nav>
  );
}
