import { es } from "@/lib/es";
import type { TeamProfile } from "@/lib/queries/team";
import { TeamCrest } from "./TeamCrest";

export function TeamHeader({ profile }: { profile: TeamProfile }) {
  const items: [string, string | null][] = [
    [es.team.profile.venue, profile.venue],
    [es.team.profile.founded, profile.founded === null ? null : String(profile.founded)],
    [es.team.profile.colors, profile.clubColors],
    [es.team.profile.coach, profile.coach],
  ];
  return (
    <div className="flex items-start gap-4 rounded-panel border border-border bg-card p-4">
      <TeamCrest crest={profile.crest} tla={profile.tla} size={56} />
      <dl className="m-0 grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {items
          .filter((i): i is [string, string] => i[1] !== null)
          .map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="num m-0 break-words">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
