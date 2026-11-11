import { describe, expect, it } from "vitest";
import { COMPETITIONS } from "@/lib/competitions";

describe("sanity", () => {
  it("lists the 5 competitions", () => {
    expect(COMPETITIONS.length).toBe(5);
  });
});
