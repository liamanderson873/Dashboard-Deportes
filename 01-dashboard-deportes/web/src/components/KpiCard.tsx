import type { ReactNode } from "react";

export function KpiCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-lg font-medium">{children}</div>
    </div>
  );
}
