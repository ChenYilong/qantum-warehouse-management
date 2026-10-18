import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * AC 53: the signal's colours are design tokens in globals.css. The test reads them from the file, so a palette
 * change that loses contrast, or that edits one dark block and not the other, fails here and not in the field.
 */
const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

function block(start: string): Record<string, string> {
  const open = css.indexOf("{", css.indexOf(start));
  const close = css.indexOf("}", open);
  const tokens: Record<string, string> = {};
  for (const match of css.slice(open + 1, close).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]!] = match[2]!.toLowerCase();
  }
  return tokens;
}

const themes = {
  light: block(":root {"),
  "dark (device)": block(':root:not([data-theme="light"])'),
  "dark (chosen)": block(':root[data-theme="dark"]'),
} as const;

const TONES = ["go", "stop", "unknown", "idle"] as const;

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const unit = channel / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe("AC 53: signal colours keep their contrast in light and dark", () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    describe(theme, () => {
      it("defines a fill, an ink and an edge for every state", () => {
        for (const tone of TONES) {
          for (const part of ["fill", "ink", "edge"]) expect(tokens[`signal-${tone}-${part}`], `${tone} ${part}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      });

      it("the label and the knob are at least 7:1 against the fill", () => {
        for (const tone of TONES) {
          expect(contrast(tokens[`signal-${tone}-ink`]!, tokens[`signal-${tone}-fill`]!), tone).toBeGreaterThanOrEqual(7);
        }
      });

      it("the edge is at least 3:1 against the page and against the card it sits on", () => {
        for (const tone of TONES) {
          const edge = tokens[`signal-${tone}-edge`]!;
          expect(contrast(edge, tokens.bg!), `${tone} on the page`).toBeGreaterThanOrEqual(3);
          expect(contrast(edge, tokens.surface!), `${tone} on the card`).toBeGreaterThanOrEqual(3);
        }
      });

      it("go is green, stop is red and can't check is amber, in hue", () => {
        const [goR, goG, goB] = channels(tokens["signal-go-fill"]!);
        expect(goG).toBeGreaterThanOrEqual(goR * 1.5);
        expect(goG).toBeGreaterThanOrEqual(goB * 1.5);
        const [stopR, stopG, stopB] = channels(tokens["signal-stop-fill"]!);
        expect(stopR).toBeGreaterThanOrEqual(stopG * 1.5);
        expect(stopR).toBeGreaterThanOrEqual(stopB * 1.5);
        const [amberR, amberG, amberB] = channels(tokens["signal-unknown-fill"]!);
        expect(amberR).toBeGreaterThanOrEqual(200);
        expect(amberG).toBeGreaterThanOrEqual(150);
        expect(amberB).toBeLessThanOrEqual(80);
      });

      it("the four fills are different colours", () => {
        expect(new Set(TONES.map((tone) => tokens[`signal-${tone}-fill`])).size).toBe(4);
      });

      it("go is much lighter than blocked, so red and green differ for a colour-blind leader and in glare, not only in hue", () => {
        expect(contrast(tokens["signal-go-fill"]!, tokens["signal-stop-fill"]!)).toBeGreaterThanOrEqual(3);
        // The knob flips with it: dark on the light switch, white on the dark one.
        expect(luminance(tokens["signal-go-ink"]!)).toBeLessThan(0.05);
        expect(luminance(tokens["signal-stop-ink"]!)).toBeGreaterThan(0.9);
      });
    });
  }

  it("the two dark blocks carry the same signal tokens", () => {
    const signal = (tokens: Record<string, string>) =>
      Object.fromEntries(Object.entries(tokens).filter(([name]) => name.startsWith("signal-")));
    expect(signal(themes["dark (device)"])).toEqual(signal(themes["dark (chosen)"]));
    expect(Object.keys(signal(themes["dark (chosen)"]))).toHaveLength(12);
  });
});
