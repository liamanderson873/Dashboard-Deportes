"use client";

import { EmptyState } from "@/components/EmptyState";
import { es } from "@/lib/es";

// `retry` re-fetches the server render (Next 16); `reset` alone would only
// re-render the cached failure.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <EmptyState level={1} title={es.error.title}>
      <p>{es.error.stepsIntro}</p>
      <ul className="mx-auto mt-2 max-w-md list-disc pl-5 text-left">
        {es.error.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 inline-flex min-h-11 items-center rounded-card bg-accent px-5 font-medium text-white"
      >
        {es.error.retry}
      </button>
    </EmptyState>
  );
}
