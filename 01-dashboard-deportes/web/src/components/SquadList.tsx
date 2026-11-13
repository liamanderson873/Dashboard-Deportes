import { es } from "@/lib/es";
import type { SquadPlayer } from "@/lib/queries/team";
import { ageOn, positionGroup, type PositionGroup } from "@/lib/team";
import { nationalityLabel } from "@/lib/translate";

const ORDER: PositionGroup[] = [
  "goalkeepers",
  "defenders",
  "midfielders",
  "forwards",
  "unknown",
];

/** Squad split by lines (goalkeepers to forwards), one column per line on wide screens. */
export function SquadList({ players, on }: { players: SquadPlayer[]; on: Date }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {ORDER.map((group) => {
        const list = players.filter((p) => positionGroup(p.position) === group);
        if (list.length === 0) return null;
        return (
          <section
            key={group}
            className="overflow-hidden rounded-panel border border-border bg-card"
          >
            <div className="flex items-baseline justify-between gap-2 bg-surface-2 px-4 py-2.5">
              <h3 className="eyebrow m-0 !text-fg">{es.team.squad.groups[group]}</h3>
              <span className="num text-xs text-subtle" aria-hidden="true">
                {list.length}
              </span>
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {list.map((p) => {
                const age = ageOn(p.dateOfBirth, on);
                return (
                  <li
                    key={p.id}
                    className="flex min-h-11 items-center justify-between gap-3 border-t border-border px-4 py-1 first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] font-medium text-fg">
                        {p.name}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {nationalityLabel(p.nationality) ?? es.team.squad.missing}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[0.8125rem] text-muted">
                      {age === null ? es.team.squad.missing : es.team.squad.age(age)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
