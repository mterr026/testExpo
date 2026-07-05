import type { ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useTheme } from "@/shared/ui/ThemeContext";

import { FinancialStateProvider } from "./FinancialStateContext";
import { OnboardingProvider } from "./OnboardingContext";
import { ProfileProvider } from "./ProfileContext";

function AppProvidersShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <FinancialStateProvider>
        <ProfileProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </ProfileProvider>
      </FinancialStateProvider>
    </GestureHandlerRootView>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <AppProvidersShell>{children}</AppProvidersShell>;
}
