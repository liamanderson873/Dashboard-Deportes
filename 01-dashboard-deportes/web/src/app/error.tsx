"use client";

import { ACTION_PRIMARY, EmptyState } from "@/components/EmptyState";
import { SiteBand } from "@/components/SiteBand";
import { es } from "@/lib/es";

// `retry` re-fetches the server render (Next 16); `reset` alone would only
// re-render the cached failure.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <SiteBand />
      <div id="contenido" className="pt-8">
        <EmptyState
          level={1}
          tone="error"
          title={es.error.title}
          action={
            <button type="button" onClick={() => retry()} className={ACTION_PRIMARY}>
              {es.error.retry}
            </button>
          }
        >
          <p>{es.error.stepsIntro}</p>
          <ol className="mt-3 flex list-none flex-col gap-2 p-0">
            {es.error.steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="num inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[0.75rem] font-semibold text-fg"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </EmptyState>
      </div>
    </>
  );
}
