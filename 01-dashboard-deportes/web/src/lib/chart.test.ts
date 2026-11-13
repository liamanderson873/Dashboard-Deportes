import { describe, expect, test } from "vitest";
import { layoutLineChart, plotBox, projectX, spreadLabels, type Series } from "./chart";

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

describe("plotBox and spreadLabels", () => {
  test("test_plot_box_uses_per_side_padding_overrides", () => {
    const box = plotBox({ width: 600, height: 300, padding: 40, paddingRight: 70, paddingTop: 20 });
    expect(box).toEqual({ left: 40, right: 530, top: 20, bottom: 260 });
  });

  test("test_projection_honours_asymmetric_padding", () => {
    const size = { width: 600, height: 300, padding: 40, paddingRight: 100 };
    expect(projectX(1, 5, size)).toBe(40);
    expect(projectX(5, 5, size)).toBe(500);
  });

  test("test_spread_labels_keeps_order_and_minimum_gap", () => {
    const out = spreadLabels(
      [
        { id: "a", y: 100 },
        { id: "b", y: 102 },
        { id: "c", y: 101 },
      ],
      12,
      0,
      200,
    );
    const ys = ["a", "c", "b"].map((id) => out.get(id) ?? NaN);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(12);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(12);
  });

  test("test_spread_labels_stays_inside_the_bounds", () => {
    const out = spreadLabels(
      [
        { id: "a", y: 195 },
        { id: "b", y: 199 },
        { id: "c", y: 200 },
      ],
      12,
      0,
      200,
    );
    for (const y of out.values()) {
      expect(y).toBeLessThanOrEqual(200);
      expect(y).toBeGreaterThanOrEqual(0);
    }
    expect(out.get("c")).toBe(200);
    expect(out.get("b")).toBe(188);
  });
});
