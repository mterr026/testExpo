import type { ReactNode } from "react";

import { FinancialStateProvider } from "./FinancialStateContext";
import { OnboardingProvider } from "./OnboardingContext";
import { ProfileProvider } from "./ProfileContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <FinancialStateProvider>
      <ProfileProvider>
        <OnboardingProvider>{children}</OnboardingProvider>
      </ProfileProvider>
    </FinancialStateProvider>
  );
}
