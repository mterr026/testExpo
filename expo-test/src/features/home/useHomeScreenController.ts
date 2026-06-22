import { useState } from "react";

import { useFinancialState } from "@/context/FinancialStateContext";
import type { Bill } from "@/shared/ui/types";

import { useBillEntryController } from "@/features/bills/hooks";
import { useHomeDerivedData } from "@/features/dashboard/hooks/useHomeDerivedData";
import { useImportReviewController } from "@/features/import/hooks";
import { useOnboardingController } from "@/features/onboarding/hooks";
import { usePaycheckEntryController } from "@/features/paychecks/hooks";
import { usePurchaseEntryController } from "@/features/purchases/hooks";
import { useSettingsActions } from "@/features/settings/hooks";

export function useHomeScreenController() {
  const [balanceCents, setBalanceCents] = useState(0);
  const [reserveCents, setReserveCents] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const {
    dashboardLoading,
    dashboardSnapshot,
    refreshDashboardSnapshot,
  } = useFinancialState();
  const {
    billCycleLabel,
    dashboardUpcomingBills,
    dashboardTotals,
    nextCyclePreview,
    paycheckBillCoverage,
    visibleBills,
    visiblePaychecks,
    visiblePurchases,
    purchaseCycleContext,
  } =
    useHomeDerivedData({
      balanceCents,
      bills,
      dashboardLoading,
      dashboardSnapshot,
      reserveCents,
    });
  const importReview = useImportReviewController({
    dashboardSnapshot,
    onFinancialDataChanged: refreshDashboardSnapshot,
    profileId: dashboardSnapshot?.profile?.id,
  });
  const { onboarding } = useOnboardingController({
    onOnboardingComplete: refreshDashboardSnapshot,
    clearImportSuggestions: importReview.clearSuggestions,
    getPendingImportSuggestionCount: () => importReview.suggestions.length,
  });
  const {
    deletePurchase,
    markPurchaseCharged,
    markPurchasePending,
    openAddPurchase,
    openPurchaseEdit,
    purchaseEntry,
  } = usePurchaseEntryController({
    onPurchasesChanged: refreshDashboardSnapshot,
  });
  const {
    confirmPaycheck,
    deletePaycheck,
    markPaycheckUnreceived,
    openAddPaycheck,
    openPaycheckEdit,
    paycheckEntry,
  } = usePaycheckEntryController({
    onPaychecksChanged: refreshDashboardSnapshot,
  });
  const {
    billConfirmation,
    billEntry,
    deleteBill,
    markBillPaid,
    markBillUnpaid,
    openAddBill,
    openBillConfirmation,
    openBillEdit,
    toggleBillPaused,
  } = useBillEntryController({
    bills,
    dashboardSnapshot,
    onBillsChanged: refreshDashboardSnapshot,
    setBills,
  });
  const settingsActions = useSettingsActions({
    onSettingsChanged: refreshDashboardSnapshot,
    profileId: dashboardSnapshot?.profile?.id,
    setReserveCents,
  });

  return {
    billConfirmation,
    billEntry,
    billCycleLabel,
    confirmPaycheck,
    deletePaycheck,
    dashboardLoading,
    dashboardSnapshot,
    dashboardTotals,
    dashboardUpcomingBills,
    importReview,
    onboarding,
    deletePurchase,
    deleteBill,
    markPurchaseCharged,
    markPurchasePending,
    openAddPurchase,
    openPurchaseEdit,
    openAddPaycheck,
    openPaycheckEdit,
    markBillPaid,
    markBillUnpaid,
    markPaycheckUnreceived,
    openAddBill,
    openBillConfirmation,
    openBillEdit,
    nextCyclePreview,
    paycheckBillCoverage,
    paycheckEntry,
    purchaseEntry,
    toggleBillPaused,
    backupExportError: settingsActions.backupExportError,
    backupExportMessage: settingsActions.backupExportMessage,
    exportBackup: settingsActions.exportBackup,
    isBackupExporting: settingsActions.isBackupExporting,
    isNotificationSaving: settingsActions.isNotificationSaving,
    notificationError: settingsActions.notificationError,
    notificationSettings: settingsActions.notificationSettings,
    toggleNotifications: settingsActions.toggleNotifications,
    updateReserve: settingsActions.updateReserve,
    visibleBills,
    visiblePaychecks,
    visiblePurchases,
    purchaseCycleContext,
  };
}

export type HomeScreenController = ReturnType<typeof useHomeScreenController>;
