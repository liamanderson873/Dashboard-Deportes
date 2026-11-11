import { es } from "@/lib/es";

const BLOCK = "animate-pulse rounded-card bg-border";

export default function Loading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{es.loading}</span>
      <div aria-hidden="true">
        <div className={`${BLOCK} mb-2 h-9 w-48`} />
        <div className={`${BLOCK} mb-6 h-5 w-64`} />
        <div className={`${BLOCK} mb-6 h-11 w-full max-w-xl`} />
        <div className="mb-6 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${BLOCK} h-[88px]`} />
          ))}
        </div>
        <div className="h-[480px] animate-pulse rounded-panel bg-border" />
      </div>
    </div>
  );
}
