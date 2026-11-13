import Link from "next/link";
export function SportNav({
  active = "football",
}: {
  active?: "football" | "nba";
}) {
  return (
    <nav
      aria-label="Deportes"
      className="flex gap-1 rounded-control border border-on-ink/20 p-0.5"
    >
      {[
        ["football", "Fútbol", "/"],
        ["nba", "NBA", "/nba"],
      ].map(([id, label, href]) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? "location" : undefined}
          className={`inline-flex min-h-11 items-center rounded-[5px] px-3 text-xs font-semibold transition-colors ${active === id ? "bg-on-ink text-ink" : "text-on-ink-muted hover:text-on-ink"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
