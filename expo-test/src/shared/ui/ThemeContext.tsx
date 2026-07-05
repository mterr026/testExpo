import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Appearance, useColorScheme } from "react-native";

import { createShadows, createStyles, type AppStyles, type ThemeShadows } from "./styles";
import {
  appearanceOverrideForPreference,
  resolveColorScheme,
  type ThemePreference,
} from "./themePreference";
import {
  loadThemePreference,
  saveThemePreference,
} from "./themePreferenceStorage";
import {
  getThemeForScheme,
  type AppTheme,
  type ThemeColors,
  type ThemeSurfaces,
} from "./theme";

type ThemeContextValue = {
  colors: ThemeColors;
  surfaces: ThemeSurfaces;
  scheme: "light" | "dark";
  isDark: boolean;
  shadows: ThemeShadows;
  styles: AppStyles;
  theme: AppTheme;
  themePreference: ThemePreference;
  isThemePreferenceReady: boolean;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("system");
  const [isThemePreferenceReady, setIsThemePreferenceReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function hydrateThemePreference() {
      const storedPreference = await loadThemePreference();

      if (!isActive) {
        return;
      }

      setThemePreferenceState(storedPreference);
      Appearance.setColorScheme(
        appearanceOverrideForPreference(storedPreference)
      );
      setIsThemePreferenceReady(true);
    }

    void hydrateThemePreference();

    return () => {
      isActive = false;
    };
  }, []);

  const scheme = resolveColorScheme(themePreference, systemScheme);
  const theme = getThemeForScheme(scheme);

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    Appearance.setColorScheme(appearanceOverrideForPreference(preference));

    try {
      await saveThemePreference(preference);
    } catch {
      // Keep the in-memory preference even if persistence fails.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const shadows = createShadows(theme);
    const styles = createStyles(theme);

    return {
      colors: theme.colors,
      surfaces: theme.surfaces,
      scheme,
      isDark: scheme === "dark",
      shadows,
      styles,
      theme,
      themePreference,
      isThemePreferenceReady,
      setThemePreference,
    };
  }, [
    isThemePreferenceReady,
    scheme,
    setThemePreference,
    theme,
    themePreference,
  ]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

export function useStyles() {
  return useTheme().styles;
}
