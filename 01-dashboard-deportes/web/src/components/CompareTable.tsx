import { es } from "@/lib/es";
import { duelBars, type CompareRow } from "@/lib/compare";
import type { StandingRow } from "@/lib/standings";
import { TeamCrest } from "./TeamCrest";

function TeamHead({ team, side }: { team: StandingRow; side: "a" | "b" }) {
  const right = side === "b";
  return (
    <th
      scope="col"
      className={`relative w-1/2 px-3 py-4 font-semibold text-fg sm:px-5 ${right ? "text-right" : "text-left"}`}
    >
      <span
        className={`flex min-w-0 items-center gap-2.5 ${right ? "flex-row-reverse" : ""}`}
        title={team.team}
      >
        <TeamCrest crest={team.crest} tla={team.tla} size={32} />
        <span className="display min-w-0 truncate text-[1.125rem] font-bold sm:text-[1.375rem]">
          {team.shortName}
        </span>
      </span>
      {right ? (
        <span
          aria-hidden="true"
          className="mono absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card px-1.5 py-0.5 text-[0.6875rem] font-medium text-subtle"
        >
          {es.compare.vs}
        </span>
      ) : null}
    </th>
  );
}

/** One side of a duel row: the value next to the axis and its bar growing outwards. */
function Duel({
  text,
  best,
  pct,
  side,
  tie,
}: {
  text: string;
  best: boolean;
  pct: number | null;
  side: "a" | "b";
  tie: boolean;
}) {
  const left = side === "a";
  const unavailable = text === es.team.unavailable;
  return (
    <td
      className={`px-3 pb-3 pt-1 sm:px-5 ${left ? "border-r border-border-strong text-right" : "text-left"}`}
    >
      <span
        className={`num block ${
          best
            ? "text-[1.0625rem] font-bold text-accent"
            : unavailable
              ? "text-sm leading-[1.6] text-subtle"
              : "text-[1.0625rem] font-medium text-fg"
        }`}
        title={unavailable ? es.compare.table.unavailableTitle : undefined}
      >
        {text}
        {best ? <span className="sr-only">{es.compare.table.better}</span> : null}
      </span>
      {pct !== null ? (
        <span
          aria-hidden="true"
          className={`mt-1.5 flex h-2 rounded-[2px] bg-surface-2 ${left ? "justify-end" : "justify-start"}`}
        >
          <span
            className={`block h-full rounded-[2px] ${best ? "bg-accent" : tie ? "bg-accent/60" : "bg-border-strong"}`}
            style={{ width: `${Math.round(pct * 10) / 10}%`, minWidth: pct > 0 ? 3 : 0 }}
          />
        </span>
      ) : null}
    </td>
  );
}

/**
 * Duel table: each metric is its own row group (label centred above), with
 * the two values and mirrored bars below. Bars are decoration (`aria-hidden`);
 * the figures carry the information.
 */
export function CompareTable({
  a,
  b,
  rows,
}: {
  a: StandingRow;
  b: StandingRow;
  rows: CompareRow[];
}) {
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-card">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">{es.compare.table.caption(a.team, b.team)}</caption>
        <thead className="border-b border-border-strong bg-card">
          <tr>
            <TeamHead team={a} side="a" />
            <TeamHead team={b} side="b" />
          </tr>
        </thead>
        {rows.map((r) => {
          const bars = duelBars(r.aValue, r.bValue);
          const tie = r.aValue !== undefined && r.aValue === r.bValue;
          return (
            <tbody key={r.label} className="border-t border-border first:border-t-0">
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={2}
                  className="eyebrow px-3 pb-0 pt-3 text-center sm:px-5"
                >
                  {r.label}
                </th>
              </tr>
              <tr>
                <Duel text={r.a} best={r.better === "a"} pct={bars?.a ?? null} side="a" tie={tie} />
                <Duel text={r.b} best={r.better === "b"} pct={bars?.b ?? null} side="b" tie={tie} />
              </tr>
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
