import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function isHapticsSupported() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

/** Native module missing until a dev build includes expo-haptics. */
let hapticsUnavailable = false;

async function runHaptic(fn: () => Promise<void>) {
  if (hapticsUnavailable || !isHapticsSupported()) {
    return;
  }

  try {
    await fn();
  } catch {
    hapticsUnavailable = true;
  }
}

/** Light tap — toggles, menu open, secondary actions. */
export async function hapticLight() {
  await runHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
}

/** Success feedback — confirm, paid, charged, save. */
export async function hapticConfirm() {
  await runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
}

/** Selection change — long-press menu, picker chips. */
export async function hapticSelection() {
  await runHaptic(() => Haptics.selectionAsync());
}

const CONFIRM_ACTION_LABELS = new Set([
  "Confirm amount",
  "Mark paid",
  "Mark unpaid",
  "Mark Charged",
  "Mark Pending",
  "Confirm received",
  "Mark unreceived",
]);

/** Route haptic style from an action-menu or swipe label. */
export function hapticForActionLabel(label: string) {
  if (CONFIRM_ACTION_LABELS.has(label)) {
    void hapticConfirm();
    return;
  }

  if (label.toLowerCase().includes("delete")) {
    void hapticLight();
    return;
  }

  void hapticSelection();
}
