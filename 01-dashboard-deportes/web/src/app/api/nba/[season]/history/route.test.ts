import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ getSql: vi.fn(() => ({})) }));
vi.mock("@/lib/queries/nba-lab", () => ({ getPredictionHistory: vi.fn() }));
import { getPredictionHistory } from "@/lib/queries/nba-lab";
import { GET } from "./route";
const context = { params: Promise.resolve({ season: "2026" }) };
const request = new Request("http://localhost/api/nba/2026/history");
afterEach(() => vi.resetAllMocks());

it("keeps a missing history distinct from a failed history and hides private errors", async () => {
  vi.mocked(getPredictionHistory).mockResolvedValueOnce([]);
  const empty = await GET(request, context);
  expect(empty.status).toBe(200);
  expect(await empty.json()).toEqual({ records: [] });
  vi.mocked(getPredictionHistory).mockRejectedValueOnce(new Error("private-database-secret"));
  const failed = await GET(request, context);
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toMatch(/private-database-secret/);
});
