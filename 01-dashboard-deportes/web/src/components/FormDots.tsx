import { es } from "@/lib/es";
import { formAriaLabel, type Result } from "@/lib/standings";

const COLOR: Record<Result, string> = {
  W: "bg-win",
  D: "bg-draw",
  L: "bg-loss",
};

/** Last results as 18px rounded-square chips with a white V/E/D letter. */
export function FormDots({ form }: { form: Result[] }) {
  return (
    <span
      role="img"
      aria-label={formAriaLabel(form)}
      className="inline-flex items-center gap-[3px]"
    >
      {form.map((r, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`inline-flex size-[18px] items-center justify-center rounded-[4px] text-[10px] font-bold leading-none text-white ${COLOR[r]}`}
        >
          {es.form.letters[r]}
        </span>
      ))}
    </span>
  );
}
