import type { ReactNode } from "react";

/** Single indicator panel (team page). Label in small caps, value below. */
export function KpiCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-lg font-semibold text-fg">{children}</div>
    </div>
  );
}
