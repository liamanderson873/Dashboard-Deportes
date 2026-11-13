import { es } from "@/lib/es";
import { sectionHref } from "@/lib/sections";

const FIELD =
  "min-h-11 w-full rounded-control border border-border-strong bg-card px-3 text-[0.9375rem] text-fg";

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
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
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

/** Compact form: two labelled selects and the button on one row from `sm` up. */
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
      className="mb-6 grid grid-cols-1 gap-3 rounded-panel border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <TeamSelect name="a" label={es.compare.form.teamA} teams={teams} value={a} />
      <TeamSelect name="b" label={es.compare.form.teamB} teams={teams} value={b} />
      <button
        type="submit"
        className="min-h-11 rounded-control bg-accent px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-fg"
      >
        {es.compare.form.submit}
      </button>
    </form>
  );
}
