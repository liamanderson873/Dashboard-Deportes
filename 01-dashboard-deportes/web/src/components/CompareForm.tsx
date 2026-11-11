import { es } from "@/lib/es";
import { sectionHref } from "@/lib/sections";

const FIELD = "min-h-11 w-full rounded-card border border-border bg-card px-3 text-fg";

function TeamSelect({
  name,
  label,
  teams,
  value,
}: {
  name: "a" | "b";
  label: string;
  teams: { id: number; name: string }[];
  value: number | null;
}) {
  const id = `compare-${name}`;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className={FIELD}>
        <option value="">{es.compare.form.placeholder}</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CompareForm({
  slug,
  season,
  teams,
  a,
  b,
}: {
  slug: string;
  season: number;
  teams: { id: number; name: string }[];
  a: number | null;
  b: number | null;
}) {
  return (
    <form
      method="get"
      action={sectionHref(slug, season, "comparar")}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <TeamSelect name="a" label={es.compare.form.teamA} teams={teams} value={a} />
      <TeamSelect name="b" label={es.compare.form.teamB} teams={teams} value={b} />
      <button
        type="submit"
        className="min-h-11 rounded-card bg-accent px-5 font-medium text-white hover:opacity-90"
      >
        {es.compare.form.submit}
      </button>
    </form>
  );
}
