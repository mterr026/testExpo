export type ThemePreference = "system" | "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: "light" | "dark" | "unspecified" | null | undefined
): "light" | "dark" {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return systemScheme === "dark" ? "dark" : "light";
}

export function appearanceOverrideForPreference(
  preference: ThemePreference
): "light" | "dark" | "unspecified" {
  return preference === "system" ? "unspecified" : preference;
}
