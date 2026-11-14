import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit inside the window and then asks to wait", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.take("a", 0).ok).toBe(true);
    expect(limiter.take("a", 1_000).ok).toBe(true);
    expect(limiter.take("a", 2_000)).toEqual({ ok: false, retryAfter: 58 });
    // Another visitor has its own count.
    expect(limiter.take("b", 2_000).ok).toBe(true);
  });

  it("frees a slot once the oldest use leaves the window", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000 });
    expect(limiter.take("a", 0).ok).toBe(true);
    expect(limiter.take("a", 9_999).ok).toBe(false);
    expect(limiter.take("a", 10_000).ok).toBe(true);
  });

  it("keeps memory bounded by forgetting the least recent visitors", () => {
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      maxKeys: 2,
    });
    limiter.take("a", 0);
    limiter.take("b", 1);
    limiter.take("c", 2);
    // "a" was evicted, so it starts again with a fresh count.
    expect(limiter.take("a", 3).ok).toBe(true);
    expect(limiter.take("c", 4).ok).toBe(false);
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost/", { headers });
  it("prefers the proxy address, then the first forwarded one", () => {
    expect(clientKey(req({ "x-real-ip": "1.2.3.4" }))).toBe("1.2.3.4");
    expect(clientKey(req({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe(
      "5.6.7.8",
    );
    expect(clientKey(req({}))).toBe("anon");
  });
});
