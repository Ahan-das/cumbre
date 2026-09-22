/**
 * Per-item palettes blended in OKLab, so a section can re-tint continuously as
 * you scroll without the in-between colours going grey.
 */
export type Palette = { bg: string; soft: string; deep: string; ink: string };

const KEYS = ["bg", "soft", "deep", "ink"] as const;

export function hexToOklab(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const css = (c: number[]) => `oklab(${c[0].toFixed(4)} ${c[1].toFixed(4)} ${c[2].toFixed(4)})`;

/**
 * Returns a writer: call it with a style object and a fractional item position
 * to set --m-bg / --m-soft / --m-deep / --m-ink for that point in the section.
 */
export function mixPalettes(palettes: Palette[]) {
  const lab = palettes.map((p) => {
    const out = {} as Record<(typeof KEYS)[number], number[]>;
    for (const k of KEYS) out[k] = hexToOklab(p[k]);
    return out;
  });
  const N = lab.length;
  return (style: CSSStyleDeclaration, pos: number) => {
    const i0 = Math.max(0, Math.min(N - 1, Math.floor(pos)));
    const i1 = Math.min(N - 1, i0 + 1);
    const raw = pos - i0;
    // a tighter blend keeps in-between tints brief, so a change reads as a wipe
    const t = Math.min(1, Math.max(0, (raw - 0.15) / 0.7));
    const f = t * t * (3 - 2 * t);
    for (const k of KEYS) style.setProperty(`--m-${k}`, css(lab[i0][k].map((v, c) => v + (lab[i1][k][c] - v) * f)));
  };
}
