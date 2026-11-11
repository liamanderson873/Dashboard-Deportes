import Image from "next/image";

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
      className="num inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-bg text-[10px] font-medium text-muted"
      style={{ width: size, height: size }}
    >
      {tla ?? ""}
    </span>
  );
}
