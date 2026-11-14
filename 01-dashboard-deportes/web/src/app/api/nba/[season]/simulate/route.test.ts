import { it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ getSql: vi.fn(() => ({})) }));
vi.mock("@/lib/queries/nba-lab", () => ({
  getSimulationConfig: vi.fn(async () => null),
}));
vi.mock("@/lib/nba-simulator", () => ({
  simulateNba: vi.fn(() => ({ runs: 2000 })),
}));
import { POST } from "./route";
import { getSimulationConfig } from "@/lib/queries/nba-lab";
import { simulateNba } from "@/lib/nba-simulator";
const context = { params: Promise.resolve({ season: "2026" }) };
it("rejects malformed, oversized and cross-origin simulation requests", async () => {
  const request = (body: string, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/nba/2026/simulate", {
      method: "POST",
      body,
      headers,
    });
  expect((await POST(request("{bad"), context)).status).toBe(400);
  expect(
    (await POST(request('{"forced":[],"runs":999999}'), context)).status,
  ).toBe(400);
  expect(
    (await POST(request("{}", { "Content-Length": "9000" }), context)).status,
  ).toBe(413);
  expect(
    (await POST(request("{}", { Origin: "https://foreign.example" }), context))
      .status,
  ).toBe(403);
  expect(
    (
      await POST(request("{}"), {
        params: Promise.resolve({ season: "wrong" }),
      })
    ).status,
  ).toBe(400);
});
it("returns a clear unavailable state instead of an invented simulation", async () => {
  const r = await POST(
    new Request("http://localhost/api/nba/2026/simulate", {
      method: "POST",
      body: "{}",
    }),
    context,
  );
  expect(r.status).toBe(503);
  expect((await r.json()).error).toMatch(/publicado/);
});

it("hides database connection errors and releases the busy flag after failure", async () => {
  vi.mocked(getSimulationConfig).mockRejectedValueOnce(
    new Error("postgresql://user:secret@private-host/db"),
  );
  const request = () =>
    new Request("http://localhost/api/nba/2026/simulate", {
      method: "POST",
      body: "{}",
    });
  const failed = await POST(request(), context);
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toMatch(/secret|private-host|postgresql/);
  expect((await POST(request(), context)).status).toBe(503);
});

it("reuses cached scenarios and limits new simulations per visitor", async () => {
  vi.mocked(getSimulationConfig).mockResolvedValue({
    modelVersion: "v1",
  } as never);
  const ask = (game: number) =>
    POST(
      new Request("http://localhost/api/nba/2026/simulate", {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.7" },
        body: JSON.stringify({
          forced: { [String(22600000000 + game).slice(1)]: 1 },
        }),
      }),
      context,
    );
  for (let game = 0; game < 8; game++)
    expect((await ask(game)).status).toBe(200);
  expect(simulateNba).toHaveBeenCalledTimes(8);
  const limited = await ask(8);
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect((await limited.json()).error).toMatch(/Espera/);
  // A scenario already calculated is served from the cache, even while limited.
  expect((await ask(3)).status).toBe(200);
  expect(simulateNba).toHaveBeenCalledTimes(8);
  vi.mocked(getSimulationConfig).mockReset();
});
