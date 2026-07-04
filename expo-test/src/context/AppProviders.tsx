import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { FinancialStateProvider } from "./FinancialStateContext";
import { OnboardingProvider } from "./OnboardingContext";
import { ProfileProvider } from "./ProfileContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <FinancialStateProvider>
        <ProfileProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </ProfileProvider>
      </FinancialStateProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
