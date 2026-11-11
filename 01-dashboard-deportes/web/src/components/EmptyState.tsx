import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-panel border border-border bg-card p-8 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      {children ? <div className="mt-2 text-muted">{children}</div> : null}
    </div>
  );
}
