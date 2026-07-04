import type { RefObject } from "react";
import { ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { screenOrder } from "@/features/app/homeData";
import { BillsScreen } from "@/features/bills/BillsScreen";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { ImportReviewSection } from "@/features/import/ImportReviewSection";
import { PaychecksScreen } from "@/features/paychecks/PaychecksScreen";
import { PurchasesScreen } from "@/features/purchases/PurchasesScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { createEmptySafeToSpendBreakdown } from "@/engine";
import { settingsMoneyAccessoryId } from "@/shared/ui/keyboard";
import { styles } from "@/shared/ui/styles";
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
  return (
    <ScrollView
      ref={pagerRef}
      horizontal
      pagingEnabled
      bounces={false}
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
          nextPaycheckLabel={controller.dashboardTotals.nextPaycheckLabel}
          reserveCents={controller.dashboardTotals.reserveCents}
          safeToSpendBreakdown={
            controller.dashboardSnapshot?.safeToSpend ?? emptySafeToSpendBreakdown
          }
          unpaidBills={controller.dashboardTotals.unpaidBills}
          unpaidBillCount={controller.dashboardTotals.unpaidBillCount}
          purchaseTotal={controller.dashboardTotals.purchaseTotal}
          safeToSpend={controller.dashboardTotals.safeToSpend}
          upcomingBills={controller.dashboardUpcomingBills}
          upcomingPaychecks={controller.dashboardUpcomingPaychecks}
          isLoading={controller.dashboardLoading}
          onOpenPaychecks={() => onChangeScreen("Paychecks")}
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
          balanceCents={controller.dashboardTotals.runningBalanceCents}
          reserveCents={controller.dashboardTotals.reserveCents}
          isBackupExporting={controller.isBackupExporting}
          isNotificationSaving={controller.isNotificationSaving}
          isSettingsReady={
            !controller.dashboardLoading && controller.dashboardSnapshot != null
          }
          notificationError={controller.notificationError}
          notificationsEnabled={
            controller.notificationSettings?.notificationsEnabled ?? null
          }
          moneyInputAccessoryId={settingsMoneyAccessoryId}
          onBackupExport={controller.exportBackup}
          onBalanceChange={controller.updateBalance}
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
