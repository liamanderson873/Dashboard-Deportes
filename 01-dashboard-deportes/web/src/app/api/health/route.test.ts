import { afterEach, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ getSql: () => query }));
import { GET } from "./route";
afterEach(() => vi.resetAllMocks());

it("reports readiness only when the required database schema is reachable", async () => {
  query.mockResolvedValueOnce([{ ready: true }]);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});

it("does not expose connection details on failure or a missing schema", async () => {
  query.mockRejectedValueOnce(new Error("postgresql://private:secret@host/database"));
  const failed = await GET();
  expect(failed.status).toBe(503);
  expect(await failed.json()).toEqual({ status: "unavailable" });
  query.mockResolvedValueOnce([{ ready: false }]);
  expect((await GET()).status).toBe(503);
});
