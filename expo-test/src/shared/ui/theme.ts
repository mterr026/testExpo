export type ThemeColors = {
  background: string;
  card: string;
  hero: string;
  soft: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  warm: string;
  warmText: string;
  warning: string;
  warningText: string;
  rowSurface: string;
  rowBorder: string;
  onAccent: string;
};

export type ThemeSurfaces = {
  card: string;
  cardBorder: string;
  cardBorderSoft: string;
  divider: string;
  dividerSoft: string;
  dividerWarm: string;
  breakdownBorder: string;
  timelineBadge: string;
  rowInset: string;
  purchaseMetricBorder: string;
};

export type AppTheme = {
  colors: ThemeColors;
  surfaces: ThemeSurfaces;
};

export const lightTheme: AppTheme = {
  colors: {
    background: "#F6F3EA",
    card: "#FFFDF7",
    hero: "#FFFDF7",
    soft: "#E7EDF2",
    text: "#14243A",
    muted: "#667085",
    border: "#DAD6C9",
    accent: "#183A5A",
    accentDark: "#0B1F33",
    accentLight: "#D9E5EF",
    warm: "#EFE7D5",
    warmText: "#455468",
    warning: "#F2E2C7",
    warningText: "#6F4A16",
    rowSurface: "#FCFAF2",
    rowBorder: "#CEC8B9",
    onAccent: "#FFFFFF",
  },
  surfaces: {
    card: "#FFFDF8",
    cardBorder: "#E4DED0",
    cardBorderSoft: "#E3DDCF",
    divider: "#ECE6D9",
    dividerSoft: "#E7E0D2",
    dividerWarm: "#E8E1D3",
    breakdownBorder: "#E2DCCA",
    timelineBadge: "#EEF3F7",
    rowInset: "#EEE8DA",
    purchaseMetricBorder: "#E9E2D3",
  },
};

export const darkTheme: AppTheme = {
  colors: {
    background: "#0F1724",
    card: "#1A2433",
    hero: "#1E2A3C",
    soft: "#243247",
    text: "#F4F6FA",
    muted: "#94A3B8",
    border: "#2E3D52",
    accent: "#6BA3D6",
    accentDark: "#8BB8E8",
    accentLight: "#1E3A52",
    warm: "#2A3548",
    warmText: "#CBD5E1",
    warning: "#3D3020",
    warningText: "#F5D08A",
    rowSurface: "#1E2A3C",
    rowBorder: "#334155",
    onAccent: "#FFFFFF",
  },
  surfaces: {
    card: "#1A2433",
    cardBorder: "#2E3D52",
    cardBorderSoft: "#283648",
    divider: "#243247",
    dividerSoft: "#1E2A3C",
    dividerWarm: "#2A3548",
    breakdownBorder: "#2E3D52",
    timelineBadge: "#243247",
    rowInset: "#243247",
    purchaseMetricBorder: "#2E3D52",
  },
};

export function getThemeForScheme(
  scheme: "light" | "dark" | null | undefined
): AppTheme {
  return scheme === "dark" ? darkTheme : lightTheme;
}
