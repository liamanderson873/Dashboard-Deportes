import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { SiteBand } from "@/components/SiteBand";
import { COMPETITIONS } from "@/lib/competitions";
import { getSql } from "@/lib/db";
import { es } from "@/lib/es";
import { getDefaultView } from "@/lib/queries/standings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const view = await getDefaultView(getSql());
  const competition = view && COMPETITIONS.find((c) => c.code === view.competition);
  if (view && competition) redirect(`/${competition.slug}/${view.season}`);

  return (
    <>
      <SiteBand />
      <div id="contenido" className="pt-8">
        <EmptyState level={1} title={es.empty.noData}>
          <p>{es.empty.noDataHint}</p>
        </EmptyState>
      </div>
    </>
  );
}
