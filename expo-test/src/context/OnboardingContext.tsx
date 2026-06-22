import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useProfile } from "./ProfileContext";

type OnboardingContextValue = {
  isOnboardingRequired: boolean;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const isOnboardingRequired = profile?.onboardingComplete === false;
  const value = useMemo(
    () => ({ isOnboardingRequired }),
    [isOnboardingRequired]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error(
      "useOnboardingContext must be used within OnboardingProvider"
    );
  }

  return context;
}
