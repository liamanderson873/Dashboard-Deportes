import Link from "next/link";

export function ProfileNav({
  sections,
  links = [],
}: {
  sections: { label: string; href: string }[];
  links?: { label: string; href: string }[];
}) {
  return (
    <div className="mb-6 rounded-panel border border-border bg-card p-4">
      <nav aria-label="En esta ficha">
        <p className="eyebrow mb-2">En esta ficha</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {sections.map((item) => (
            <li key={item.href}>
              <a
                className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
                href={item.href}
              >
                {item.label}
                <span aria-hidden="true" className="ml-1">
                  ↓
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {links.length > 0 && (
        <nav
          aria-label="Seguir explorando"
          className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3"
        >
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-3 text-sm font-semibold text-accent hover:bg-accent-soft"
            >
              {item.label}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
