import { createContext, useContext, type ReactNode } from "react";

import type { DashboardSnapshot } from "@/features/dashboard/services";
import { useDashboardSnapshot } from "@/features/dashboard/hooks/useDashboardSnapshot";

type FinancialStateContextValue = {
  dashboardSnapshot: DashboardSnapshot | null;
  dashboardLoading: boolean;
  dashboardError: string;
  refreshDashboardSnapshot: () => Promise<void>;
};

const FinancialStateContext = createContext<FinancialStateContextValue | null>(
  null
);

export function FinancialStateProvider({ children }: { children: ReactNode }) {
  const value = useDashboardSnapshot();

  return (
    <FinancialStateContext.Provider value={value}>
      {children}
    </FinancialStateContext.Provider>
  );
}

export function useFinancialState() {
  const context = useContext(FinancialStateContext);

  if (!context) {
    throw new Error("useFinancialState must be used within FinancialStateProvider");
  }

  return context;
}
