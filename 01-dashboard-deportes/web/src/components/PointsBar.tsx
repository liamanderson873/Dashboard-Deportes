/** Points in scoreboard figures with a thin bar proportional to the leader. */
export function PointsBar({ points, max }: { points: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (points / max) * 100)) : 0;
  return (
    <span className="flex items-center justify-end gap-3">
      <span
        aria-hidden="true"
        className="hidden h-1 w-20 overflow-hidden rounded-[2px] bg-surface-2 md:block"
      >
        <span
          className="block h-full rounded-[2px] bg-accent"
          style={{
            width: `${Math.round(pct * 100) / 100}%`,
            minWidth: points > 0 ? 3 : 0,
          }}
        />
      </span>
      <span className="score w-8 text-right text-[1.125rem] text-fg">{points}</span>
    </span>
  );
}
