import { describe, expect, test } from "vitest";
import { layoutLineChart, type Series } from "./chart";

const SIZE = { width: 600, height: 300, padding: 40 };

function serie(over: Partial<Series> = {}): Series {
  return {
    id: "2024",
    label: "2024/25",
    highlight: false,
    points: [
      { x: 1, y: 3 },
      { x: 2, y: 6 },
      { x: 3, y: 30 },
    ],
    ...over,
  };
}

describe("layoutLineChart", () => {
  test("test_layout_scales_points_into_the_padded_area", () => {
    const { paths } = layoutLineChart([serie()], SIZE);
    // x: first point at left edge (40), last at right edge (560).
    // y: max 30 = top tick, so it sits on the top edge (40); the baseline is 260.
    expect(paths[0].d).toBe("M40 238 L300 216 L560 40");
  });

  test("test_y_ticks_are_round_and_cover_the_maximum", () => {
    const layout = layoutLineChart(
      [serie({ points: [{ x: 1, y: 88 }] })],
      SIZE,
    );
    expect(layout.yMax).toBe(88);
    expect(layout.yTicks[0]).toBe(0);
    expect(layout.yTicks.at(-1)).toBe(90);
    expect(layout.yTicks.every((t) => t % 10 === 0)).toBe(true);
  });

  test("test_single_point_series_is_a_valid_path", () => {
    const { paths, xMax } = layoutLineChart(
      [serie({ points: [{ x: 1, y: 0 }] })],
      SIZE,
    );
    expect(xMax).toBe(1);
    expect(paths[0].d).toBe("M40 260");
  });

  test("test_no_series_gives_no_paths", () => {
    const layout = layoutLineChart([], SIZE);
    expect(layout.paths).toEqual([]);
    expect(layout.xMax).toBe(1);
    expect(layout.yMax).toBe(1);
    expect(layout.yTicks).toEqual([0, 10]);
  });

  test("test_highlight_flag_is_kept", () => {
    const { paths } = layoutLineChart(
      [serie({ id: "a", highlight: true }), serie({ id: "b" })],
      SIZE,
    );
    expect(paths.map((p) => [p.id, p.highlight])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });
});
