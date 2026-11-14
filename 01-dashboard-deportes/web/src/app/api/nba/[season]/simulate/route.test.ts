import { it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ getSql: vi.fn(() => ({})) }));
vi.mock("@/lib/queries/nba-lab", () => ({
  getSimulationConfig: vi.fn(async () => null),
}));
import { POST } from "./route";
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
