import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("design tokens", () => {
  it("test_text_and_form_circle_colors_meet_wcag_aa_contrast", () => {
    const white = "#ffffff";
    expect(contrast(white, token("win"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(white, token("draw"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(white, token("loss"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("fg"), token("bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("muted"), token("bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("accent"), token("card"))).toBeGreaterThanOrEqual(4.5);
  });
});
