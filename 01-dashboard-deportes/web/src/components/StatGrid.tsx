export function StatGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted">{i.label}</dt>
          <dd className="num m-0 mt-1 text-lg font-medium">{i.value}</dd>
          {i.hint ? <dd className="m-0 text-xs text-muted">{i.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
