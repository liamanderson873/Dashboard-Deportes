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

type Size = { width: number; height: number; padding: number };

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** The x domain runs from 1 (first match) to `xMax`. */
export function projectX(x: number, xMax: number, size: Size): number {
  const inner = size.width - 2 * size.padding;
  const span = Math.max(xMax - 1, 1);
  return round1(size.padding + ((x - 1) / span) * inner);
}

/** The y domain runs from 0 to the top (rounded-up) tick. */
export function projectY(y: number, top: number, size: Size): number {
  const inner = size.height - 2 * size.padding;
  return round1(size.height - size.padding - (y / top) * inner);
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
