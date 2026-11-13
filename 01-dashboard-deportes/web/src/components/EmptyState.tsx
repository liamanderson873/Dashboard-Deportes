import type { ReactNode } from "react";

/**
 * Neutral panel for empty, error and not-found states: title, explanation and
 * an optional action. `tone="error"` draws the border in the loss colour.
 */
export function EmptyState({
  title,
  level = 2,
  tone = "neutral",
  action,
  children,
}: {
  title: string;
  level?: 1 | 2;
  tone?: "neutral" | "error";
  action?: ReactNode;
  children?: ReactNode;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  const border = tone === "error" ? "border-loss border-l-4" : "border-border";
  return (
    <div
      className={`rounded-panel border bg-card px-5 py-8 sm:px-8 sm:py-10 ${border}`}
    >
      <div className="max-w-xl">
        <Heading
          className={`display font-bold text-fg ${level === 1 ? "text-[2rem]" : "text-[1.5rem]"}`}
        >
          {title}
        </Heading>
        {children ? (
          <div className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{children}</div>
        ) : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

/** Button-like link or button styles shared by the state panels. */
export const ACTION_PRIMARY =
  "inline-flex min-h-11 items-center rounded-control bg-accent px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-fg";
export const ACTION_SECONDARY =
  "inline-flex min-h-11 items-center rounded-control border border-border-strong bg-card px-5 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-2";
