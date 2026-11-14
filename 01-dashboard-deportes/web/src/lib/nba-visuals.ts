/** Readable bounded numeric axes; missing observations never become zero. */
export function numericAxis(
  values: (number | null | undefined)[],
  includeZero = true,
  intervals = 4,
) {
  const finite = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  let low = finite.length ? Math.min(...finite) : 0,
    high = finite.length ? Math.max(...finite) : 1;
  if (includeZero) {
    low = Math.min(0, low);
    high = Math.max(0, high);
  }
  if (high === low) {
    const pad = Math.max(Math.abs(high) * 0.1, 1);
    low = includeZero && low >= 0 ? 0 : low - pad;
    high += pad;
  }
  const raw = (high - low) / intervals,
    power = 10 ** Math.floor(Math.log10(raw)),
    ratio = raw / power;
  const multiplier = [1, 2, 2.5, 5, 10].find((n) => n >= ratio) ?? 10,
    step = multiplier * power;
  const min = Math.floor(low / step) * step,
    max = Math.ceil(high / step) * step;
  const ticks = Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, i) => Number((min + i * step).toPrecision(12)),
  );
  return { min, max, step, ticks, span: max - min };
}
export function shotDifficulty(probability: number | null): number | null {
  return probability === null ||
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1
    ? null
    : 1 - probability;
}
