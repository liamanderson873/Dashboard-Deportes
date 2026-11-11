export function PointsBar({ points, max }: { points: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (points / max) * 100)) : 0;
  return (
    <span className="flex items-center justify-end gap-3">
      <span
        aria-hidden="true"
        className="hidden h-2 w-24 overflow-hidden rounded-full bg-border md:block"
      >
        <span
          className="block h-full rounded-full bg-accent-soft"
          style={{ width: `${Math.round(pct * 100) / 100}%` }}
        />
      </span>
      <span className="num font-medium">{points}</span>
    </span>
  );
}
