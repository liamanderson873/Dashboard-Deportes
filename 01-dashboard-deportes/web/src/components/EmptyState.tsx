import type { ReactNode } from "react";

export function EmptyState({
  title,
  level = 2,
  children,
}: {
  title: string;
  level?: 1 | 2;
  children?: ReactNode;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="rounded-panel border border-border bg-card p-8 text-center">
      <Heading className="text-lg font-medium">{title}</Heading>
      {children ? <div className="mt-2 text-muted">{children}</div> : null}
    </div>
  );
}
