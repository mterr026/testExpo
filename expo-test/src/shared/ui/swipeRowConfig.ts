/** Horizontal movement before a row pan activates (avoids scroll fights). */
export const SWIPE_ROW_ACTIVE_OFFSET_X = 10;

/** Vertical drift that cancels a horizontal row swipe. */
export const SWIPE_ROW_FAIL_OFFSET_Y = 8;

/** Finger travel follows the row 1:1 (default RNGH friction is 1, not 2). */
export const SWIPE_ROW_FRICTION = 1;

export const SWIPE_ROW_OVERSHOOT_FRICTION = 4;

/** Snap open after a short left swipe instead of half the action panel width. */
export const SWIPE_ROW_RIGHT_THRESHOLD = 36;

export function getSwipeRowActiveOffsetX(isOpen: boolean): [number, number] {
  return isOpen
    ? [-10000, SWIPE_ROW_ACTIVE_OFFSET_X]
    : [-SWIPE_ROW_ACTIVE_OFFSET_X, 10000];
}

export const swipeRowGestureProps = {
  friction: SWIPE_ROW_FRICTION,
  overshootFriction: SWIPE_ROW_OVERSHOOT_FRICTION,
  overshootRight: false as const,
  rightThreshold: SWIPE_ROW_RIGHT_THRESHOLD,
  failOffsetY: [-SWIPE_ROW_FAIL_OFFSET_Y, SWIPE_ROW_FAIL_OFFSET_Y] as [number, number],
};
