import { describe, expect, it } from "vitest";

import {
  buildDimRegions,
  buildHighlightRect,
  buildPointerLayout,
  resolveTooltipPlacement,
  resolveTooltipPosition,
} from "./tutorialLayout";

describe("tutorialLayout", () => {
  it("buildHighlightRect_adds_padding_around_layout", () => {
    expect(
      buildHighlightRect({ x: 20, y: 40, width: 100, height: 50 }, 8)
    ).toEqual({
      x: 12,
      y: 32,
      width: 116,
      height: 66,
    });
  });

  it("buildDimRegions_creates_four_panels_around_highlight", () => {
    const regions = buildDimRegions(
      { x: 50, y: 100, width: 200, height: 80 },
      400,
      800
    );

    expect(regions).toHaveLength(4);
    expect(regions[0]).toEqual({ left: 0, top: 0, width: 400, height: 100 });
    expect(regions[1]).toEqual({ left: 0, top: 100, width: 50, height: 80 });
    expect(regions[2]).toEqual({ left: 250, top: 100, width: 150, height: 80 });
    expect(regions[3]).toEqual({ left: 0, top: 180, width: 400, height: 620 });
  });

  it("resolveTooltipPlacement_prefers_explicit_placement", () => {
    const highlight = { x: 0, y: 300, width: 100, height: 80 };

    expect(resolveTooltipPlacement(highlight, 800, "above")).toBe("above");
    expect(resolveTooltipPlacement(highlight, 800, "below")).toBe("below");
  });

  it("resolveTooltipPlacement_auto_chooses_side_with_more_space", () => {
    const lowHighlight = { x: 0, y: 600, width: 100, height: 80 };
    const highHighlight = { x: 0, y: 80, width: 100, height: 80 };

    expect(resolveTooltipPlacement(lowHighlight, 800, "auto")).toBe("above");
    expect(resolveTooltipPlacement(highHighlight, 800, "auto")).toBe("below");
  });

  it("resolveTooltipPosition_places_card_below_or_above_highlight", () => {
    const highlight = { x: 20, y: 120, width: 200, height: 60 };

    expect(
      resolveTooltipPosition({
        highlight,
        tooltipPlacement: "below",
        windowHeight: 800,
        gap: 56,
      })
    ).toEqual({ top: 236 });

    expect(
      resolveTooltipPosition({
        highlight,
        tooltipPlacement: "above",
        windowHeight: 800,
        gap: 56,
      })
    ).toEqual({ bottom: 736 });
  });

  it("buildPointerLayout_connects_tooltip_to_target", () => {
    const highlight = { x: 40, y: 100, width: 120, height: 48 };

    const below = buildPointerLayout({
      highlight,
      tooltipPlacement: "below",
      tooltipTop: 204,
      tooltipBottom: 404,
    });

    expect(below.direction).toBe("up");
    expect(below.centerX).toBe(100);
    expect(below.headTop).toBe(154);
    expect(below.shaftHeight).toBeGreaterThan(0);

    const above = buildPointerLayout({
      highlight,
      tooltipPlacement: "above",
      tooltipTop: 20,
      tooltipBottom: 220,
    });

    expect(above.direction).toBe("down");
    expect(above.centerX).toBe(100);
    expect(above.shaftHeight).toBeGreaterThan(0);
  });
});
