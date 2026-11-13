import Image from "next/image";

/** Club crest, or a neutral circle with the club code when there is none. */
export function TeamCrest({
  crest,
  tla,
  size,
}: {
  crest: string | null;
  tla: string | null;
  size: number;
}) {
  if (crest) {
    return (
      <Image
        src={crest}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="mono inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-medium tracking-tight text-muted"
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.36)) }}
    >
      {tla ?? ""}
    </span>
  );
}
