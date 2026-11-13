import { SiteBand } from "@/components/SiteBand";
import { es } from "@/lib/es";

// Same structure as a league page (band, header, indicator strip, table) in
// --surface-2; `.skeleton` pulses gently unless reduced motion is requested.
const BLOCK = "skeleton rounded-control";

export default function Loading() {
  return (
    <>
      <SiteBand />
      <div role="status" aria-busy="true">
        <span className="sr-only">{es.loading}</span>
        <div aria-hidden="true">
          <div className="flex flex-col gap-4 pb-5 pt-6 md:flex-row md:items-end md:justify-between md:pt-8">
            <div>
              <div className={`${BLOCK} h-11 w-56 md:h-12`} />
              <div className={`${BLOCK} mt-3 h-4 w-72 max-w-full`} />
            </div>
            <div className={`${BLOCK} h-11 w-64 max-w-full`} />
          </div>
          <div className="mb-6 flex gap-6 border-b border-border pb-3 pt-3">
            {[96, 88, 92, 100].map((w) => (
              <div key={w} className={`${BLOCK} h-4`} style={{ width: w }} />
            ))}
          </div>
          <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-3 bg-card p-5">
                <div className={`${BLOCK} h-3 w-20`} />
                <div className={`${BLOCK} h-5 w-32 max-w-full`} />
                <div className={`${BLOCK} h-9 w-16`} />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-panel border border-border bg-card">
            <div className="h-9 bg-surface-2" />
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex h-11 items-center gap-3 border-t border-border px-4">
                <div className={`${BLOCK} h-3 w-5`} />
                <div className={`${BLOCK} size-[22px] rounded-full`} />
                <div className={`${BLOCK} h-3 w-40 max-w-[40%]`} />
                <div className={`${BLOCK} ml-auto h-4 w-8`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
