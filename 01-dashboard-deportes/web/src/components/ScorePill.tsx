import type { ReactNode } from "react";

/**
 * The centre of a match row: result in scoreboard figures inside a pill, or
 * (pending) the kick-off time in precision type. Used by Results and the team page.
 */
export function ScorePill({
  children,
  pending = false,
}: {
  children: ReactNode;
  pending?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-h-10 min-w-[4.75rem] items-center justify-center rounded-control bg-surface-2 px-3 py-1.5 text-center ${
        pending ? "mono text-[0.6875rem] leading-tight text-muted" : "score text-[1.5rem] text-fg"
      }`}
    >
      {children}
    </span>
  );
}
