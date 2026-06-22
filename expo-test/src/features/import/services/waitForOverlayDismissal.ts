const DEFAULT_OVERLAY_DISMISS_TIMEOUT_MS = 700;

type OverlayDismissalWaiter = {
  notifyDismissed: () => void;
  waitForDismissal: () => Promise<void>;
};

export function createOverlayDismissalWaiter(
  timeoutMs = DEFAULT_OVERLAY_DISMISS_TIMEOUT_MS
): OverlayDismissalWaiter {
  let resolveWait: (() => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function notifyDismissed() {
    if (!resolveWait) {
      return;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    resolveWait();
    resolveWait = null;
  }

  function waitForDismissal() {
    return new Promise<void>((resolve) => {
      resolveWait = resolve;
      timeoutId = setTimeout(() => {
        notifyDismissed();
      }, timeoutMs);
    });
  }

  return {
    notifyDismissed,
    waitForDismissal,
  };
}

export async function waitForNextReactFrame() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
