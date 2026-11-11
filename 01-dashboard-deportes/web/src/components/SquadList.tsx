import { es } from "@/lib/es";
import type { SquadPlayer } from "@/lib/queries/team";
import { ageOn, positionGroup, type PositionGroup } from "@/lib/team";

const ORDER: PositionGroup[] = [
  "goalkeepers",
  "defenders",
  "midfielders",
  "forwards",
  "unknown",
];

export function SquadList({ players, on }: { players: SquadPlayer[]; on: Date }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {ORDER.map((group) => {
        const list = players.filter((p) => positionGroup(p.position) === group);
        if (list.length === 0) return null;
        return (
          <section key={group} className="rounded-card border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-muted">
              {es.team.squad.groups[group]}
            </h3>
            <ul className="m-0 flex list-none flex-col p-0">
              {list.map((p) => {
                const age = ageOn(p.dateOfBirth, on);
                return (
                  <li
                    key={p.id}
                    className="flex min-h-11 items-center justify-between gap-3 border-t border-border first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{p.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.nationality ?? es.team.squad.missing}
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm text-muted">
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
