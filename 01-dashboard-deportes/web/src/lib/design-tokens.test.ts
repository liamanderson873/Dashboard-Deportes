import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

const baseTokens = css.match(/:root \{([^}]+)\}/)![1];
const nbaTokens = css.match(
  /:root:has\(\[data-sport="nba"\]\) \{([^}]+)\}/,
)![1];
function token(name: string, theme = "football"): string {
  const palette = theme === "nba" ? nbaTokens + baseTokens : baseTokens;
  const m = palette.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
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

// Every text/background pair the UI actually uses, as [text, background].
const TEXT_PAIRS: [string, string][] = [
  ["fg", "bg"],
  ["fg", "card"],
  ["fg", "surface-2"],
  ["fg", "accent-soft"],
  ["muted", "bg"],
  ["muted", "card"],
  ["muted", "surface-2"],
  ["subtle", "bg"],
  ["subtle", "card"],
  ["subtle", "surface-2"],
  ["accent", "bg"],
  ["accent", "card"],
  ["accent", "surface-2"],
  ["accent", "accent-soft"],
  ["loss", "card"],
  ["on-ink", "ink"],
  ["on-ink-muted", "ink"],
  ["sport-light", "ink"],
];

// White letters on filled chips and buttons.
const WHITE_ON = ["win", "draw", "loss", "accent"];

describe.each(["football", "nba"])("%s design tokens", (theme) => {
  it("test_every_text_pair_meets_wcag_aa_contrast", () => {
    for (const [text, background] of TEXT_PAIRS) {
      expect(
        contrast(token(text, theme), token(background, theme)),
        `--${text} on --${background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("test_white_text_on_result_chips_and_accent_meets_wcag_aa_contrast", () => {
    for (const fill of WHITE_ON) {
      expect(
        contrast("#ffffff", token(fill, theme)),
        `white on --${fill}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("test_secondary_text_on_white_reaches_aaa", () => {
    expect(
      contrast(token("muted", theme), token("card", theme)),
    ).toBeGreaterThanOrEqual(7);
  });
});
