import { describe, expect, it } from "vitest";

import {
  appearanceOverrideForPreference,
  isThemePreference,
  resolveColorScheme,
} from "./themePreference";

describe("isThemePreference", () => {
  it("accepts_valid_theme_preferences", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
  });

  it("rejects_invalid_values", () => {
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});

describe("resolveColorScheme", () => {
  it("uses_explicit_light_and_dark_preferences", () => {
    expect(resolveColorScheme("light", "dark")).toBe("light");
    expect(resolveColorScheme("dark", "light")).toBe("dark");
  });

  it("follows_system_scheme_when_preference_is_system", () => {
    expect(resolveColorScheme("system", "dark")).toBe("dark");
    expect(resolveColorScheme("system", "light")).toBe("light");
    expect(resolveColorScheme("system", "unspecified")).toBe("light");
    expect(resolveColorScheme("system", null)).toBe("light");
  });
});

describe("appearanceOverrideForPreference", () => {
  it("returns_unspecified_for_system_and_explicit_values_otherwise", () => {
    expect(appearanceOverrideForPreference("system")).toBe("unspecified");
    expect(appearanceOverrideForPreference("light")).toBe("light");
    expect(appearanceOverrideForPreference("dark")).toBe("dark");
  });
});
