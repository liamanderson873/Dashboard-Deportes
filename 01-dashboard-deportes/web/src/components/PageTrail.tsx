"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PageTrail({
  base,
  sport,
  league,
  title,
  section,
  sectionPath,
}: {
  base: string;
  sport: "Fútbol" | "NBA";
  league: string;
  title: string;
  section: string;
  sectionPath: string;
}) {
  const pathname = usePathname();
  const deep = pathname.replace(/\/$/, "") !== `${base}${sectionPath}`;
  const items = [
    { label: sport === "NBA" ? league : `${sport} · ${league}`, href: base },
  ];
  if (sectionPath)
    items.push({ label: section, href: `${base}${sectionPath}` });
  if (deep) items.push({ label: title, href: pathname });
  return (
    <nav aria-label="Ruta de navegación" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li
            key={`${item.href}-${index}`}
            className="inline-flex min-w-0 items-center gap-2"
          >
            {index > 0 && (
              <span aria-hidden="true" className="text-subtle">
                /
              </span>
            )}
            {index === items.length - 1 ? (
              <span
                aria-current="page"
                className="break-words font-semibold text-fg"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center text-accent hover:underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
