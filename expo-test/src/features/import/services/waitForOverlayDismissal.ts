const DEFAULT_OVERLAY_DISMISS_TIMEOUT_MS = 1_000;
const MODAL_PRESENTATION_BUFFER_MS = 350;

function runAfterInteractions(callback: () => void) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => callback());
    return;
  }

  setTimeout(callback, 0);
}

type OverlayDismissalWaiter = {
  notifyDismissed: () => void;
  reset: () => void;
  waitForDismissal: () => Promise<void>;
};

export function createOverlayDismissalWaiter(
  timeoutMs = DEFAULT_OVERLAY_DISMISS_TIMEOUT_MS
): OverlayDismissalWaiter {
  let resolveWait: (() => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function clearPendingWait() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    resolveWait = null;
  }

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
    clearPendingWait();

    return new Promise<void>((resolve) => {
      resolveWait = resolve;
      timeoutId = setTimeout(() => {
        notifyDismissed();
      }, timeoutMs);
    });
  }

  return {
    notifyDismissed,
    reset: clearPendingWait,
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

export async function waitForModalPresentationReady() {
  await new Promise<void>((resolve) => {
    runAfterInteractions(() => {
      setTimeout(resolve, MODAL_PRESENTATION_BUFFER_MS);
    });
  });
}

export async function waitForImportLoadingPaint() {
  await waitForNextReactFrame();

  await new Promise<void>((resolve) => {
    runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}
