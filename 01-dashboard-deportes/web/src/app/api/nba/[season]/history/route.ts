import { getSql } from "@/lib/db";
import { nbaSeasonParam } from "@/lib/nba";
import { getPredictionHistory } from "@/lib/queries/nba-lab";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ season: string }> },
) {
  const season = nbaSeasonParam((await params).season);
  if (season === null)
    return Response.json({ error: "Temporada inválida." }, { status: 400 });
  return Response.json(
    { records: await getPredictionHistory(getSql(), season) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
