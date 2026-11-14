import { getSql } from "@/lib/db";
import { nbaSeasonParam } from "@/lib/nba";
import { getSimulationConfig } from "@/lib/queries/nba-lab";
import { simulateNba, type SimResult } from "@/lib/nba-simulator";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
// Recent results, reused when someone asks for the same scenario again.
const cache = new Map<string, SimResult>();
const CACHE_SIZE = 32;
// New (uncached) simulations per visitor; each one costs a few seconds of CPU.
const limiter = createRateLimiter({ limit: 8, windowMs: 60_000 });
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
  let loaded = false;
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
    loaded = true;
    // Same season, model and forced results always give the same answer (fixed seed).
    const scenario = Object.entries(forced).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
      key = `${season}:${config.modelVersion}:${JSON.stringify(scenario)}`;
    let result = cache.get(key);
    if (result) {
      // Mark as recently used.
      cache.delete(key);
    } else {
      const allowed = limiter.take(clientKey(request));
      if (!allowed.ok)
        return Response.json(
          {
            error: `Has calculado muchos escenarios seguidos. Espera ${allowed.retryAfter} s y vuelve a intentarlo.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(allowed.retryAfter),
              "Cache-Control": "no-store",
            },
          },
        );
      result = simulateNba(config, forced, 2000, 42);
    }
    cache.set(key, result);
    while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      {
        error: loaded
          ? "No se pudo calcular este escenario. Comprueba las condiciones y vuelve a intentarlo."
          : "El simulador no está disponible en este momento. Vuelve a intentarlo.",
      },
      { status: loaded ? 422 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    busy = false;
  }
}
