import type { RefObject } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { screenOrder } from "@/features/home/screenOrder";
import { BillsScreen } from "@/features/bills/BillsScreen";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { ImportReviewSection } from "@/features/import/ImportReviewSection";
import { PaychecksScreen } from "@/features/paychecks/PaychecksScreen";
import { PurchasesScreen } from "@/features/purchases/PurchasesScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { createEmptySafeToSpendBreakdown } from "@/features/dashboard/adapters/dashboardViewAdapters";
import { settingsMoneyAccessoryId } from "@/shared/ui/keyboard";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { Screen } from "@/shared/ui/types";

import type { NotificationTarget } from "@/features/notifications/types";

import type { HomeScreenController } from "../useHomeScreenController";

const emptySafeToSpendBreakdown = createEmptySafeToSpendBreakdown();

type HomePagerProps = {
  controller: HomeScreenController;
  notificationTarget: NotificationTarget;
  onChangeScreen: (screen: Screen) => void;
  onClearNotificationTarget: () => void;
  onScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  pagerRef: RefObject<ScrollView | null>;
  width: number;
};

export function HomePager({
  controller,
  notificationTarget,
  onChangeScreen,
  onClearNotificationTarget,
  onScrollEnd,
  pagerRef,
  width,
}: HomePagerProps) {
  const styles = useStyles();
  return (
    <ScrollView
      ref={pagerRef}
      horizontal
      pagingEnabled
      bounces={false}
      scrollEnabled={false}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator={false}
      style={styles.screenPane}
      onMomentumScrollEnd={onScrollEnd}
    >
      {screenOrder.map((screen) => (
        <View key={screen} style={[styles.pagerPage, { width }]}>
          {renderPagerScreen({
            controller,
            notificationTarget,
            onChangeScreen,
            onClearNotificationTarget,
            screen,
          })}
        </View>
      ))}
    </ScrollView>
  );
}

function renderPagerScreen({
  controller,
  notificationTarget,
  onChangeScreen,
  onClearNotificationTarget,
  screen,
}: {
  controller: HomeScreenController;
  notificationTarget: NotificationTarget;
  onChangeScreen: (screen: Screen) => void;
  onClearNotificationTarget: () => void;
  screen: Screen;
}) {
  switch (screen) {
    case "Dashboard":
      return (
        <DashboardScreen
          activeCycleEndDate={
            controller.dashboardSnapshot?.activeCycleEndDate ?? null
          }
          activeCycleStartDate={
            controller.dashboardSnapshot?.activeCycleStartDate ?? null
          }
          nextPaycheckLabel={controller.dashboardTotals.nextPaycheckLabel}
          reserveCents={controller.dashboardTotals.reserveCents}
          safeToSpendBreakdown={
            controller.dashboardSnapshot?.safeToSpend ?? emptySafeToSpendBreakdown
          }
          envelopeEntries={
            controller.dashboardSnapshot?.envelopeSnapshot.entries ?? []
          }
          envelopes={controller.dashboardSnapshot?.envelopes ?? []}
          envelopesEnabled={
            controller.dashboardSnapshot?.envelopeSnapshot.envelopesEnabled ??
            false
          }
          unpaidBills={controller.dashboardTotals.unpaidBills}
          unpaidBillCount={controller.dashboardTotals.unpaidBillCount}
          purchaseTotal={controller.dashboardTotals.purchaseTotal}
          safeToSpend={controller.dashboardTotals.safeToSpend}
          upcomingBills={controller.dashboardUpcomingBills}
          upcomingPaychecks={controller.dashboardUpcomingPaychecks}
          isLoading={controller.dashboardLoading}
          onOpenBills={() => onChangeScreen("Bills")}
          onOpenPaychecks={() => onChangeScreen("Paychecks")}
          onOpenPurchases={() => onChangeScreen("Purchases")}
          onOpenSettings={() => onChangeScreen("Settings")}
          onAddEnvelope={controller.openAddEnvelope}
          onDeleteEnvelope={controller.deleteEnvelope}
          onEditEnvelope={controller.openEnvelopeEdit}
          onToggleEnvelopePaused={controller.toggleEnvelopePaused}
        />
      );
    case "Purchases":
      return (
        <PurchasesScreen
          purchases={controller.visiblePurchases ?? []}
          activeCyclePaycheckId={controller.purchaseCycleContext.activeCyclePaycheckId}
          activeCycleStartDate={controller.purchaseCycleContext.activeCycleStartDate}
          activeCycleEndDate={controller.purchaseCycleContext.activeCycleEndDate}
          paychecks={controller.purchaseCycleContext.paychecks ?? []}
          onAddPurchase={controller.openAddPurchase}
          onDeletePurchase={controller.deletePurchase}
          onEditPurchase={controller.openPurchaseEdit}
          onMarkCharged={controller.markPurchaseCharged}
          onMarkPending={controller.markPurchasePending}
        />
      );
    case "Bills":
      return (
        <BillsScreen
          actionError={controller.billEntry.error}
          bills={controller.visibleBills}
          cycleLabel={controller.billCycleLabel}
          dueThisCycleBills={controller.dashboardUpcomingBills}
          openActionMenuForBillId={
            notificationTarget?.screen === "Bills"
              ? notificationTarget.entityId
              : null
          }
          onAddBill={controller.openAddBill}
          onClearOpenActionMenuTarget={onClearNotificationTarget}
          onDeleteBill={controller.deleteBill}
          onEditBill={controller.openBillEdit}
          onMarkPaid={controller.markBillPaid}
          onMarkUnpaid={controller.markBillUnpaid}
          onConfirmBill={controller.openBillConfirmation}
          onToggleBillPaused={controller.toggleBillPaused}
        />
      );
    case "Paychecks":
      return (
        <PaychecksScreen
          nextCyclePreview={controller.nextCyclePreview}
          openActionMenuForPaycheckId={
            notificationTarget?.screen === "Paychecks"
              ? notificationTarget.entityId
              : null
          }
          paycheckBillCoverage={controller.paycheckBillCoverage}
          paychecks={controller.visiblePaychecks}
          onAddPaycheck={controller.openAddPaycheck}
          onClearOpenActionMenuTarget={onClearNotificationTarget}
          onConfirmPaycheck={controller.confirmPaycheck}
          onDeletePaycheck={controller.deletePaycheck}
          onEditPaycheck={controller.openPaycheckEdit}
          onMarkPaycheckUnreceived={controller.markPaycheckUnreceived}
        />
      );
    case "Settings":
      return (
        <SettingsScreen
          key={controller.dashboardSnapshot?.profile?.id ?? "profile"}
          backupExportError={controller.backupExportError}
          backupExportMessage={controller.backupExportMessage}
          backupImportError={controller.backupImportError}
          backupImportMessage={controller.backupImportMessage}
          balanceCents={controller.dashboardTotals.runningBalanceCents}
          reserveCents={controller.dashboardTotals.reserveCents}
          envelopesEnabled={controller.budgetingPreferences?.envelopesEnabled ?? null}
          envelopeToggleError={controller.envelopeToggleError}
          isBackupExporting={controller.isBackupExporting}
          isBackupImporting={controller.isBackupImporting}
          isEnvelopesToggleSaving={controller.isEnvelopesToggleSaving}
          isNotificationSaving={controller.isNotificationSaving}
          isSettingsReady={controller.dashboardSnapshot != null}
          notificationError={controller.notificationError}
          notificationsEnabled={
            controller.notificationSettings?.notificationsEnabled ?? null
          }
          moneyInputAccessoryId={settingsMoneyAccessoryId}
          onBackupExport={controller.exportBackup}
          onBackupImport={controller.importBackup}
          onBalanceChange={controller.updateBalance}
          onEnvelopesToggle={controller.toggleEnvelopes}
          onNotificationsToggle={controller.toggleNotifications}
          onReserveChange={controller.updateReserve}
          afterContent={<SettingsImportReview controller={controller} />}
        />
      );
  }
}

function SettingsImportReview({
  controller,
}: {
  controller: HomeScreenController;
}) {
  return (
    <ImportReviewSection
      error={controller.importReview.error}
      importMessage={controller.importReview.importMessage}
      isClearing={controller.importReview.isClearing}
      isImporting={controller.importReview.isImporting}
      importPhase={controller.importReview.importPhase}
      isLoading={controller.importReview.isLoading}
      onClearSuggestions={controller.importReview.clearSuggestions}
      onImportFile={controller.importReview.importFile}
      onConfirmSuggestion={controller.importReview.openConfirmSuggestion}
      onRejectAllSuggestions={controller.importReview.rejectAllPendingSuggestions}
      suggestions={controller.importReview.suggestions}
      onRejectSuggestion={controller.importReview.rejectSuggestion}
    />
  );
}
