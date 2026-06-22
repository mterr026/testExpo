import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
    },
  },
}));

import {
  createOverlayDismissalWaiter,
} from "./waitForOverlayDismissal";

describe("createOverlayDismissalWaiter", () => {
  it("resolves_when_the_overlay_reports_dismissal", async () => {
    const waiter = createOverlayDismissalWaiter(1_000);
    const dismissal = waiter.waitForDismissal();

    waiter.notifyDismissed();

    await expect(dismissal).resolves.toBeUndefined();
  });

  it("falls_back_to_timeout_when_dismissal_is_never_reported", async () => {
    vi.useFakeTimers();

    const waiter = createOverlayDismissalWaiter(25);
    const dismissal = waiter.waitForDismissal();

    await vi.advanceTimersByTimeAsync(25);

    await expect(dismissal).resolves.toBeUndefined();

    vi.useRealTimers();
  });
});
