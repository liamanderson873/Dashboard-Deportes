export type Series = {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  highlight: boolean;
};

export type ChartLayout = {
  width: number;
  height: number;
  xMax: number;
  yMax: number;
  xTicks: number[];
  yTicks: number[];
  paths: { id: string; d: string; highlight: boolean }[];
};

/** `padding` is the default inset; the optional sides override it (axis labels, end labels). */
export type Size = {
  width: number;
  height: number;
  padding: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
};

/** Plot area edges (left, right, top, bottom) inside the SVG. */
export function plotBox(size: Size): { left: number; right: number; top: number; bottom: number } {
  return {
    left: size.padding,
    right: size.width - (size.paddingRight ?? size.padding),
    top: size.paddingTop ?? size.padding,
    bottom: size.height - (size.paddingBottom ?? size.padding),
  };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** The x domain runs from 1 (first match) to `xMax`. */
export function projectX(x: number, xMax: number, size: Size): number {
  const { left, right } = plotBox(size);
  const span = Math.max(xMax - 1, 1);
  return round1(left + ((x - 1) / span) * (right - left));
}

/** The y domain runs from 0 to the top (rounded-up) tick. */
export function projectY(y: number, top: number, size: Size): number {
  const box = plotBox(size);
  return round1(box.bottom - (y / top) * (box.bottom - box.top));
}

/**
 * Vertical positions for the labels at the end of each line: keeps the wanted
 * order and at least `gap` between neighbours, inside [min, max].
 */
export function spreadLabels(
  items: { id: string; y: number }[],
  gap: number,
  min: number,
  max: number,
): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const ys = sorted.map((i) => Math.min(max, Math.max(min, i.y)));
  for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
  // If the pushes overflowed the bottom, shift the tail back up.
  for (let i = ys.length - 1; i >= 0; i--) {
    const limit = i === ys.length - 1 ? max : ys[i + 1] - gap;
    ys[i] = Math.min(ys[i], limit);
  }
  return new Map(sorted.map((it, i) => [it.id, ys[i]]));
}

export function layoutLineChart(series: Series[], size: Size): ChartLayout {
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  const xMax = Math.max(1, ...xs);
  const yMax = Math.max(1, ...ys);

  const top = Math.ceil(yMax / 10) * 10;
  const yTicks: number[] = [];
  for (let t = 0; t <= top; t += 10) yTicks.push(t);

  const xStep = xMax > 10 ? 5 : 1;
  const xTicks = [1];
  for (let t = xStep; t <= xMax; t += xStep) if (t > 1) xTicks.push(t);

  const paths = series.map((s) => ({
    id: s.id,
    highlight: s.highlight,
    d: s.points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${projectX(p.x, xMax, size)} ${projectY(p.y, top, size)}`,
      )
      .join(" "),
  }));

  return { width: size.width, height: size.height, xMax, yMax, xTicks, yTicks, paths };
}
