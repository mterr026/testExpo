import "react-native-gesture-handler";

import { DefaultTheme, Stack, ThemeProvider } from "expo-router";

import { AnimatedSplashOverlay } from "@/features/app/AnimatedSplashOverlay";
import { AppProviders } from "@/context/AppProviders";

export default function TabLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AppProviders>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </ThemeProvider>
  );
}
