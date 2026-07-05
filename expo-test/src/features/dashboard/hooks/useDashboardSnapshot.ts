import { useCallback, useEffect, useRef, useState } from "react";

import type { DashboardSnapshot } from "@/features/dashboard/services";
import { FINANCIAL_STATE_CHANGED } from "@/shared/events/financialEvents";
import { getAppRuntime } from "@/shared/services/appRuntime";

import { getOrCreateActiveProfile } from "@/shared/services/activeProfile";
import { getTodayIsoDate } from "@/shared/dates";

export function useDashboardSnapshot() {
  const [dashboardSnapshot, setDashboardSnapshot] =
    useState<DashboardSnapshot | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const hasLoadedSnapshotRef = useRef(false);

  const loadDashboardSnapshot = useCallback(async () => {
    try {
      if (!hasLoadedSnapshotRef.current) {
        setDashboardLoading(true);
      }
      const runtime = await getAppRuntime();
      await getOrCreateActiveProfile(runtime);
      const snapshot = await runtime.services.dashboardService.loadDashboardSnapshot(
        getTodayIsoDate()
      );

      setDashboardSnapshot(snapshot);
      hasLoadedSnapshotRef.current = true;
      setDashboardError("");
    } catch {
      setDashboardError("Dashboard could not be refreshed.");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    async function loadActiveDashboardSnapshot() {
      try {
        if (!hasLoadedSnapshotRef.current) {
          setDashboardLoading(true);
        }
        const runtime = await getAppRuntime();
        await getOrCreateActiveProfile(runtime);
        const snapshot = await runtime.services.dashboardService.loadDashboardSnapshot(
          getTodayIsoDate()
        );

        if (isActive) {
          setDashboardSnapshot(snapshot);
          hasLoadedSnapshotRef.current = true;
          setDashboardError("");
        }
      } catch {
        if (isActive) {
          setDashboardError("Dashboard could not be refreshed.");
        }
      } finally {
        if (isActive) {
          setDashboardLoading(false);
        }
      }
    }

    getAppRuntime().then((runtime) => {
      if (!isActive) {
        return;
      }

      unsubscribe = runtime.eventBus.subscribe(
        FINANCIAL_STATE_CHANGED,
        loadActiveDashboardSnapshot
      );
    });
    loadActiveDashboardSnapshot();

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [loadDashboardSnapshot]);

  return {
    dashboardError,
    dashboardLoading,
    dashboardSnapshot,
    refreshDashboardSnapshot: loadDashboardSnapshot,
  };
}
