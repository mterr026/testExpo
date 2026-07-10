import type { AppTheme } from "./theme";

/** 4pt spacing grid — use these instead of one-off pixel values. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 18,
  xxxl: 32,
} as const;

/** Corner radii — cards use lg/xl; chips and inputs use sm/md. */
export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  sheet: 18,
  fab: 27,
  pill: 999,
} as const;

/** Type scale — sizes and weights for consistent hierarchy. */
export const fontSize = {
  caption: 11,
  meta: 12,
  label: 13,
  body: 14,
  bodyLg: 16,
  title: 17,
  sectionCompact: 19,
  section: 23,
  logo: 23,
  displaySm: 38,
  display: 52,
} as const;

/** Inter faces loaded in app/_layout.tsx via @expo-google-fonts/inter. */
export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  heavy: "Inter_800ExtraBold",
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
} as const;

/** Prefer fontFamily over fontWeight — Inter uses discrete face files. */
export function fontStyle(weight: keyof typeof fontFamily = "regular") {
  return { fontFamily: fontFamily[weight] } as const;
}

export const lineHeight = {
  tight: 17,
  body: 20,
  relaxed: 22,
  displaySm: 44,
  display: 58,
} as const;

/** Home shell layout — bottom nav, FAB, and scroll clearance. */
export const homeChrome = {
  navClearance: 80,
  navContentHeight: 72,
  fabBottomOffset: spacing.xxxl * 2 + spacing.sm,
  fabSize: 56,
  fabScrollPaddingExtra: spacing.sm,
} as const;

export function getBottomNavHeight(bottomInset: number) {
  return (
    spacing.sm +
    2 +
    homeChrome.navContentHeight +
    Math.max(bottomInset, 10) +
    spacing.sm
  );
}

/** Distance from the screen bottom to the FAB's bottom edge. */
export function getFabBottom(bottomInset: number) {
  return getBottomNavHeight(bottomInset) + spacing.md;
}

/** Scroll content padding when the add-purchase FAB is visible. */
export function getFabScrollPadding(bottomInset: number) {
  return (
    getFabBottom(bottomInset) +
    homeChrome.fabSize +
    homeChrome.fabScrollPaddingExtra
  );
}
