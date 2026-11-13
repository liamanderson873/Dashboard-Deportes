import { es } from "@/lib/es";
import type { TeamProfile } from "@/lib/queries/team";
import { clubColorsLabel } from "@/lib/translate";
import { TeamCrest } from "./TeamCrest";

/**
 * Club card under the page title (the h1 is the team name from LeagueHeader):
 * big crest and a horizontal definition list of club data split by hairlines.
 */
export function TeamHeader({ profile }: { profile: TeamProfile }) {
  const items: [string, string | null][] = [
    [es.team.profile.venue, profile.venue],
    [es.team.profile.founded, profile.founded === null ? null : String(profile.founded)],
    [es.team.profile.colors, clubColorsLabel(profile.clubColors)],
    [es.team.profile.coach, profile.coach],
  ];
  const shown = items.filter((i): i is [string, string] => i[1] !== null);
  return (
    <div className="mb-10 flex flex-col gap-5 rounded-panel border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <TeamCrest crest={profile.crest} tla={profile.tla} size={72} />
      <dl className="m-0 grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-4 lg:flex lg:flex-wrap lg:gap-y-2 lg:divide-x lg:divide-border">
        {shown.map(([label, value]) => (
          <div key={label} className="min-w-0 lg:px-6 lg:first:pl-0">
            <dt className="eyebrow">{label}</dt>
            <dd className="num m-0 mt-1 break-words text-[0.9375rem] font-medium text-fg">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
