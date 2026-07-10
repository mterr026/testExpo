import type { LayoutRectangle } from "react-native";

export const TUTORIAL_HIGHLIGHT_PADDING = 8;
export const TUTORIAL_TOOLTIP_GAP = 56;
export const TUTORIAL_TOOLTIP_ESTIMATED_HEIGHT = 180;
export const TUTORIAL_SAFE_AREA_TOP = 96;
export const TUTORIAL_SAFE_AREA_BOTTOM = 110;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export type DimRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type HighlightRect = LayoutRectangle & {
  x: number;
  y: number;
};

export function buildHighlightRect(
  layout: LayoutRectangle,
  padding = TUTORIAL_HIGHLIGHT_PADDING
): HighlightRect {
  return {
    x: Math.max(0, layout.x - padding),
    y: Math.max(0, layout.y - padding),
    width: layout.width + padding * 2,
    height: layout.height + padding * 2,
  };
}

export function buildDimRegions(
  highlight: HighlightRect,
  windowWidth: number,
  windowHeight: number
): DimRegion[] {
  const { x, y, width, height } = highlight;
  const right = x + width;
  const bottom = y + height;

  return [
    { left: 0, top: 0, width: windowWidth, height: y },
    { left: 0, top: y, width: x, height },
    { left: right, top: y, width: Math.max(0, windowWidth - right), height },
    {
      left: 0,
      top: bottom,
      width: windowWidth,
      height: Math.max(0, windowHeight - bottom),
    },
  ].filter((region) => region.width > 0 && region.height > 0);
}

export function resolveTooltipPlacement(
  highlight: HighlightRect,
  windowHeight: number,
  preferred: "above" | "below" | "auto" = "auto"
): "above" | "below" {
  if (preferred === "above" || preferred === "below") {
    return preferred;
  }

  const spaceAbove = highlight.y;
  const spaceBelow = windowHeight - (highlight.y + highlight.height);

  return spaceBelow >= spaceAbove ? "below" : "above";
}

export type PointerLayout = {
  centerX: number;
  direction: "up" | "down";
  headTop: number;
  shaftTop: number;
  shaftHeight: number;
};

export function buildPointerLayout({
  highlight,
  tooltipPlacement,
  tooltipTop,
  tooltipBottom,
}: {
  highlight: HighlightRect;
  tooltipPlacement: "above" | "below";
  tooltipTop: number;
  tooltipBottom: number;
}): PointerLayout {
  const centerX = highlight.x + highlight.width / 2;

  if (tooltipPlacement === "below") {
    const headTop = highlight.y + highlight.height + 6;
    const shaftTop = headTop + 18;
    const shaftBottom = tooltipTop - 10;

    return {
      centerX,
      direction: "up",
      headTop,
      shaftTop,
      shaftHeight: Math.max(8, shaftBottom - shaftTop),
    };
  }

  const headTop = highlight.y - 24;
  const shaftBottom = headTop - 2;
  const shaftTop = tooltipBottom + 10;

  return {
    centerX,
    direction: "down",
    headTop,
    shaftTop,
    shaftHeight: Math.max(8, shaftBottom - shaftTop),
  };
}

export function resolveTooltipPosition({
  highlight,
  tooltipPlacement,
  windowHeight,
  gap = TUTORIAL_TOOLTIP_GAP,
  tooltipHeight = TUTORIAL_TOOLTIP_ESTIMATED_HEIGHT,
  safeTop = TUTORIAL_SAFE_AREA_TOP,
  safeBottom = TUTORIAL_SAFE_AREA_BOTTOM,
}: {
  highlight: HighlightRect;
  tooltipPlacement: "above" | "below";
  windowHeight: number;
  gap?: number;
  tooltipHeight?: number;
  safeTop?: number;
  safeBottom?: number;
}): { top: number; placement: "above" | "below" } {
  const maxTop = Math.max(safeTop, windowHeight - tooltipHeight - safeBottom);
  const idealBelow = highlight.y + highlight.height + gap;
  const idealAbove = highlight.y - gap - tooltipHeight;
  const belowFits = idealBelow <= maxTop;
  const aboveFits = idealAbove >= safeTop;

  function overlapsHighlight(top: number) {
    const bottom = top + tooltipHeight;
    return top < highlight.y + highlight.height && bottom > highlight.y;
  }

  function overlapAmount(top: number) {
    const bottom = top + tooltipHeight;
    const overlapTop = Math.max(top, highlight.y);
    const overlapBottom = Math.min(bottom, highlight.y + highlight.height);
    return Math.max(0, overlapBottom - overlapTop);
  }

  const belowCandidate =
    belowFits && !overlapsHighlight(idealBelow)
      ? ({ top: idealBelow, placement: "below" } as const)
      : null;
  const aboveCandidate =
    aboveFits && !overlapsHighlight(idealAbove)
      ? ({ top: idealAbove, placement: "above" } as const)
      : null;

  if (tooltipPlacement === "below") {
    if (belowCandidate) {
      return belowCandidate;
    }
    if (aboveCandidate) {
      return aboveCandidate;
    }
  } else {
    if (aboveCandidate) {
      return aboveCandidate;
    }
    if (belowCandidate) {
      return belowCandidate;
    }
  }

  const topDock = { top: safeTop, placement: "above" as const };
  const bottomDock = { top: maxTop, placement: "below" as const };

  if (overlapAmount(bottomDock.top) < overlapAmount(topDock.top)) {
    return bottomDock;
  }
  if (overlapAmount(topDock.top) < overlapAmount(bottomDock.top)) {
    return topDock;
  }

  return tooltipPlacement === "below" ? bottomDock : topDock;
}
