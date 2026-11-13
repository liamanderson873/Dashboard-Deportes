import { SiteBand } from "@/components/SiteBand";
export default function Loading() {
  return (
    <>
      <SiteBand sport="nba" />
      <div role="status" aria-busy="true" className="py-8">
        <span className="sr-only">Cargando estadísticas NBA…</span>
        <div aria-hidden="true">
          <div className="skeleton mb-4 h-12 w-72 max-w-full rounded-control" />
          <div className="skeleton mb-8 h-5 w-48 rounded-control" />
          <div className="skeleton mb-8 h-16 rounded-panel" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-28 rounded-panel" />
            ))}
          </div>
          <div className="skeleton mt-6 h-96 rounded-panel" />
        </div>
      </div>
    </>
  );
}
