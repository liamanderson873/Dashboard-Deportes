import { getSql } from "@/lib/db";
import { nbaSeasonParam } from "@/lib/nba";
import { getSimulationConfig } from "@/lib/queries/nba-lab";
import { simulateNba, type SimResult } from "@/lib/nba-simulator";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = new Map<string, SimResult>();
let busy = false;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ season: string }> },
) {
  const season = nbaSeasonParam((await params).season);
  if (season === null)
    return Response.json({ error: "Temporada inválida." }, { status: 400 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 8000)
    return Response.json(
      { error: "Escenario demasiado grande." },
      { status: 413 },
    );
  let forced: Record<string, number> = {};
  try {
    const raw = await request.text();
    if (raw.length > 8000) throw new Error();
    const body = JSON.parse(raw || "{}");
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).some((k) => k !== "forced")
    )
      throw new Error();
    const v = body.forced ?? {};
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).length > 12 ||
      Object.entries(v).some(
        ([k, n]) =>
          !/^\d{10}$/.test(k) ||
          typeof n !== "number" ||
          !Number.isSafeInteger(n),
      )
    )
      throw new Error();
    forced = v;
  } catch {
    return Response.json(
      { error: "Usa hasta doce partidos y un participante como ganador." },
      { status: 400 },
    );
  }
  if (busy)
    return Response.json(
      { error: "Hay otra simulación en curso. Vuelve a intentarlo." },
      { status: 429, headers: { "Retry-After": "2" } },
    );
  busy = true;
  try {
    const config = await getSimulationConfig(getSql(), season);
    if (!config)
      return Response.json(
        {
          error:
            "El laboratorio todavía no está publicado para esta temporada.",
        },
        { status: 503 },
      );
    const baseline = Object.keys(forced).length === 0,
      key = `${season}:${config.modelVersion}`;
    let result = baseline ? cache.get(key) : undefined;
    if (!result) {
      result = simulateNba(config, forced, 2000, 42);
      if (baseline) {
        if (cache.size >= 4) cache.clear();
        cache.set(key, result);
      }
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar la simulación.",
      },
      { status: 422 },
    );
  } finally {
    busy = false;
  }
}
