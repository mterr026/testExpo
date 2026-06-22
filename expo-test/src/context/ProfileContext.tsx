import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Profile } from "@/database/repositories/types";

import { useFinancialState } from "./FinancialStateContext";

type ProfileContextValue = {
  profile: Profile | null;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { dashboardSnapshot } = useFinancialState();
  const profile = dashboardSnapshot?.profile ?? null;
  const value = useMemo(() => ({ profile }), [profile]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }

  return context;
}
