import { useState } from "react";

import { useProfile } from "@/context/ProfileContext";
import { useFinancialState } from "@/context/FinancialStateContext";
import type { Bill } from "@/shared/ui/types";

import { useBillEntryController } from "@/features/bills/hooks";
import {
  useBudgetingSettingsActions,
  useEnvelopeEntryController,
} from "@/features/budgeting/hooks";
import { useHomeDerivedData } from "@/features/dashboard/hooks/useHomeDerivedData";
import { useImportReviewController } from "@/features/import/hooks";
import { useOnboardingController } from "@/features/onboarding/hooks";
import { useTutorialController } from "@/features/tutorial/hooks";
import { usePaycheckEntryController } from "@/features/paychecks/hooks";
import { usePurchaseEntryController } from "@/features/purchases/hooks";
import { useSettingsActions } from "@/features/settings/hooks";
import type { Screen } from "@/shared/ui/types";

type UseHomeScreenControllerInput = {
  changeScreen?: (screen: Screen) => void;
};

export function useHomeScreenController({
  changeScreen,
}: UseHomeScreenControllerInput = {}) {
  const [balanceCents, setBalanceCents] = useState(0);
  const [reserveCents, setReserveCents] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const {
    dashboardLoading,
    dashboardSnapshot,
    refreshDashboardSnapshot,
  } = useFinancialState();
  const { profile } = useProfile();
  const {
    billCycleLabel,
    dashboardUpcomingBills,
    dashboardUpcomingPaychecks,
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
    profileId: profile?.id ?? dashboardSnapshot?.profile?.id,
  });
  const { onboarding } = useOnboardingController({
    onOnboardingComplete: refreshDashboardSnapshot,
    clearImportSuggestions: importReview.clearSuggestions,
    getPendingImportSuggestionCount: () => importReview.suggestions.length,
  });
  const { tutorial } = useTutorialController({
    changeScreen,
    onTutorialComplete: refreshDashboardSnapshot,
  });
  const budgetingSettingsActions = useBudgetingSettingsActions({
    onSettingsChanged: refreshDashboardSnapshot,
    profileId: dashboardSnapshot?.profile?.id,
  });
  const envelopesEnabled =
    budgetingSettingsActions.budgetingPreferences?.envelopesEnabled ??
    dashboardSnapshot?.budgetingPreferences?.envelopesEnabled ??
    false;
  const {
    deletePurchase,
    markPurchaseCharged,
    markPurchasePending,
    openAddPurchase,
    openAddPurchaseWithPrefill,
    openPurchaseEdit,
    purchaseEntry,
  } = usePurchaseEntryController({
    envelopesEnabled,
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
    setBalanceCents,
    setReserveCents,
  });
  const {
    deleteEnvelope,
    envelopeEntry,
    openAddEnvelope,
    openEnvelopeEdit,
    toggleEnvelopePaused,
  } = useEnvelopeEntryController({
    envelopes: dashboardSnapshot?.envelopes ?? [],
    onEnvelopesChanged: refreshDashboardSnapshot,
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
    dashboardUpcomingPaychecks,
    importReview,
    onboarding,
    tutorial,
    deletePurchase,
    deleteBill,
    markPurchaseCharged,
    markPurchasePending,
    openAddPurchase,
    openAddPurchaseWithPrefill,
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
    budgetingPreferences:
      budgetingSettingsActions.budgetingPreferences ??
      dashboardSnapshot?.budgetingPreferences ??
      null,
    deleteEnvelope,
    envelopeEntry,
    envelopeToggleError: budgetingSettingsActions.envelopeToggleError,
    exportBackup: settingsActions.exportBackup,
    isBackupExporting: settingsActions.isBackupExporting,
    isEnvelopesToggleSaving: budgetingSettingsActions.isEnvelopesToggleSaving,
    isNotificationSaving: settingsActions.isNotificationSaving,
    notificationError: settingsActions.notificationError,
    notificationSettings: settingsActions.notificationSettings,
    openAddEnvelope,
    openEnvelopeEdit,
    toggleEnvelopePaused,
    toggleEnvelopes: budgetingSettingsActions.toggleEnvelopes,
    toggleNotifications: settingsActions.toggleNotifications,
    updateBalance: settingsActions.updateBalance,
    updateReserve: settingsActions.updateReserve,
    visibleBills,
    visiblePaychecks,
    visiblePurchases,
    purchaseCycleContext,
  };
}

export type HomeScreenController = ReturnType<typeof useHomeScreenController>;
