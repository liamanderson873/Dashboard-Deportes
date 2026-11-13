/** Compact grid of figures: small-caps label over a scoreboard value, split by hairlines. */
export function StatGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string; unavailable?: boolean }[];
}) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border md:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="flex min-w-0 flex-col gap-1.5 bg-card p-4">
          <dt className="eyebrow">{i.label}</dt>
          <dd
            className={`m-0 ${
              i.unavailable
                ? "text-[0.875rem] leading-8 text-subtle"
                : "score text-[1.75rem] text-fg"
            }`}
          >
            {i.value}
          </dd>
          {i.hint ? <dd className="m-0 text-xs text-subtle">{i.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
