import type { AppTheme } from "./theme";

/** Reusable elevation presets — keep shadows subtle and on-brand. */
export function createShadows(theme: AppTheme) {
  const { colors } = theme;

  return {
    none: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    subtle: {
      shadowColor: colors.accentDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.025,
      shadowRadius: 5,
      elevation: 1,
    },
    card: {
      shadowColor: colors.accentDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    raised: {
      shadowColor: colors.accentDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    },
    hero: {
      shadowColor: colors.accentDark,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 5,
    },
    fab: {
      shadowColor: colors.accentDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 5,
    },
  } as const;
}

export type ThemeShadows = ReturnType<typeof createShadows>;
