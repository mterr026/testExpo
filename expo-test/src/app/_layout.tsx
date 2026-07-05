import "react-native-gesture-handler";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { AnimatedSplashOverlay } from "@/features/app/AnimatedSplashOverlay";
import { AppProviders } from "@/context/AppProviders";
import { ThemeProvider, useTheme } from "@/shared/ui/ThemeContext";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden during fast refresh.
});

export default function TabLayout() {
  return (
    <ThemeProvider>
      <TabLayoutShell />
    </ThemeProvider>
  );
}

function TabLayoutShell() {
  const { isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AppProviders>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </NavigationThemeProvider>
  );
}
