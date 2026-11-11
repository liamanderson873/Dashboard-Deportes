import { es } from "@/lib/es";
import { formAriaLabel, type Result } from "@/lib/standings";

const COLOR: Record<Result, string> = {
  W: "bg-win",
  D: "bg-draw",
  L: "bg-loss",
};

export function FormDots({ form }: { form: Result[] }) {
  return (
    <span
      role="img"
      aria-label={formAriaLabel(form)}
      className="inline-flex items-center gap-1"
    >
      {form.map((r, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`num inline-flex size-[22px] items-center justify-center rounded-full text-[11px] font-medium text-white ${COLOR[r]}`}
        >
          {es.form.letters[r]}
        </span>
      ))}
    </span>
  );
}
