import type { ReactNode } from "react";

/** Titled block of a page: small-caps h2 over a strong hairline, then content. */
export function PanelSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border-strong pb-2">
        <h2 className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-fg">
          {title}
        </h2>
        {note ? <p className="m-0 text-[0.8125rem] text-subtle">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
