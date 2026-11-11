import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
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
    <EmptyState title={es.empty.noData}>
      <p>{es.empty.noDataHint}</p>
    </EmptyState>
  );
}
