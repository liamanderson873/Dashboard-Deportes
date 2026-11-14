import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness only: no credentials, schema names or database errors in public responses. */
export async function GET() {
  try {
    const [row] = await getSql()`SELECT
      to_regclass('public.matches') IS NOT NULL AND
      to_regclass('public.bsd_player_matches') IS NOT NULL AND
      to_regclass('public.nba_games') IS NOT NULL AND
      to_regclass('public.nba_models') IS NOT NULL AS ready`;
    if (!row?.ready) throw new Error("Schema unavailable");
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
