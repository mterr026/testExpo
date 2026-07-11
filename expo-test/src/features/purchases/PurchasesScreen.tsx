import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, money } from "@/shared/ui/components";
import { CycleSummaryCard } from "@/shared/ui/CycleSummaryCard";
import { ScreenSectionTitle } from "@/shared/ui/ScreenSectionTitle";
import { ScreenShell } from "@/shared/ui/ScreenShell";
import { getFabScrollPadding } from "@/shared/ui/styles";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { PaycheckListItem, Purchase } from "@/shared/ui/types";

import { formatDashboardCycleLabel } from "@/features/dashboard/dashboardCycleLabel";

import {
  buildPurchaseCycleOptions,
  filterPurchasesForCycle,
  getArchivedPurchaseCycleOptions,
  getPurchaseSummaryForPurchases,
} from "./purchaseCycles";
import {
  getFilterLabel,
  PREVIOUS_PURCHASES_PAGE_SIZE,
  purchaseFilters,
  type PurchaseFilter,
} from "./purchaseScreenHelpers";
import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { useTutorialScrollView } from "@/features/tutorial/hooks";

import { PurchaseSwipeableRow } from "./components/PurchaseSwipeableRow";
import {
  PreviousCycleRow,
  PreviousCyclesSection,
} from "./components/PreviousCyclesSection";
import { formatPurchaseCycleHeaderSummary } from "./purchaseCycleHeader";
import {
  groupPurchasesByDate,
  sortPurchasesByMostRecent,
} from "./purchaseDateGrouping";

type PurchasesScreenProps = {
  purchases: Purchase[];
  activeCyclePaycheckId: string | null;
  activeCycleStartDate: string | null;
  activeCycleEndDate: string | null;
  paychecks: PaycheckListItem[];
  onDeletePurchase: (id: string) => void | Promise<void>;
  onEditPurchase: (purchase: Purchase) => void;
  onAddPurchase?: () => void;
  onMarkCharged: (id: string) => void | Promise<void>;
  onMarkPending: (id: string) => void | Promise<void>;
};

export function PurchasesScreen({
  purchases: purchasesProp,
  activeCyclePaycheckId,
  activeCycleStartDate,
  activeCycleEndDate,
  paychecks: paychecksProp,
  onDeletePurchase,
  onEditPurchase,
  onAddPurchase,
  onMarkCharged,
  onMarkPending,
}: PurchasesScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const purchases = purchasesProp ?? [];
  const paychecks = paychecksProp ?? [];
  const [showPreviousCycles, setShowPreviousCycles] = useState(false);
  const [expandedCycleIds, setExpandedCycleIds] = useState<Set<string>>(
    () => new Set()
  );
  const [cycleVisibleCounts, setCycleVisibleCounts] = useState<
    Record<string, number>
  >({});
  const [openSwipePurchaseId, setOpenSwipePurchaseId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PurchaseFilter>("All");
  const cycleContext = {
    activeCyclePaycheckId,
    activeCycleStartDate,
    activeCycleEndDate,
    paychecks,
  };
  const cycleOptions = buildPurchaseCycleOptions(purchases, cycleContext);
  const currentCyclePurchases = activeCyclePaycheckId
    ? filterPurchasesForCycle(purchases, activeCyclePaycheckId, cycleContext)
    : [];
  const unassignedCycleOption =
    cycleOptions.find((option) => option.id === "unassigned") ?? null;
  const outsideCyclePurchases = filterPurchasesForCycle(
    purchases,
    "unassigned",
    cycleContext
  );
  const hasOutsideCyclePurchases =
    outsideCyclePurchases.length > 0 ||
    (unassignedCycleOption?.transactionCount ?? 0) > 0;
  const previousCycleOptions = getArchivedPurchaseCycleOptions(cycleOptions).filter(
    (option) => option.id !== "unassigned"
  );
  const sortedCurrentPurchases = [...currentCyclePurchases].sort(sortPurchasesByMostRecent);
  const sortedOutsideCyclePurchases = [...outsideCyclePurchases].sort(
    sortPurchasesByMostRecent
  );
  const filteredPurchases = sortedCurrentPurchases.filter((purchase) =>
    activeFilter === "All" ? true : purchase.status === activeFilter
  );
  const filteredOutsideCyclePurchases = sortedOutsideCyclePurchases.filter(
    (purchase) => (activeFilter === "All" ? true : purchase.status === activeFilter)
  );
  const purchaseSummary = getPurchaseSummaryForPurchases(currentCyclePurchases);
  const pendingPurchaseCount = currentCyclePurchases.filter(
    (purchase) => purchase.status === "Pending"
  ).length;
  const cycleLabel = formatDashboardCycleLabel(
    activeCycleStartDate,
    activeCycleEndDate
  );
  const { onTutorialScroll, tutorialScrollRef } = useTutorialScrollView("Purchases");

  function renderPurchaseSwipeableRow(purchase: Purchase) {
    return (
      <PurchaseSwipeableRow
        key={purchase.id}
        purchase={purchase}
        isSwipeOpen={openSwipePurchaseId === purchase.id}
        onDeletePurchase={onDeletePurchase}
        onEditPurchase={onEditPurchase}
        onMarkCharged={onMarkCharged}
        onMarkPending={onMarkPending}
        onSwipeClose={() =>
          setOpenSwipePurchaseId((currentId) =>
            currentId === purchase.id ? null : currentId
          )
        }
        onSwipeOpen={setOpenSwipePurchaseId}
      />
    );
  }

  function renderPurchaseDateGroups(purchaseList: Purchase[], keyPrefix = "") {
    return groupPurchasesByDate(purchaseList).map((group) => (
      <View key={`${keyPrefix}${group.dateKey}`} style={styles.transactionDateGroup}>
        <ScreenSectionTitle title={group.label} />
        <View style={styles.purchaseSwipeableList}>
          {group.purchases.map((purchase) => renderPurchaseSwipeableRow(purchase))}
        </View>
      </View>
    ));
  }

  function togglePreviousCycles() {
    setShowPreviousCycles((expanded) => {
      if (expanded) {
        setExpandedCycleIds(new Set());
        setCycleVisibleCounts({});
      }

      return !expanded;
    });
  }

  function toggleCyclePurchases(cycleId: string) {
    setExpandedCycleIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(cycleId)) {
        nextIds.delete(cycleId);
        setCycleVisibleCounts((counts) => {
          const nextCounts = { ...counts };
          delete nextCounts[cycleId];
          return nextCounts;
        });
      } else {
        nextIds.add(cycleId);
        setCycleVisibleCounts((counts) => ({
          ...counts,
          [cycleId]: PREVIOUS_PURCHASES_PAGE_SIZE,
        }));
      }

      return nextIds;
    });
  }

  function loadMoreCyclePurchases(cycleId: string) {
    setCycleVisibleCounts((counts) => ({
      ...counts,
      [cycleId]:
        (counts[cycleId] ?? PREVIOUS_PURCHASES_PAGE_SIZE) +
        PREVIOUS_PURCHASES_PAGE_SIZE,
    }));
  }

  return (
    <ScrollView
      ref={tutorialScrollRef}
      style={styles.content}
      contentContainerStyle={{ paddingBottom: getFabScrollPadding(insets.bottom) }}
      directionalLockEnabled
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={onTutorialScroll}
      onScrollBeginDrag={() => setOpenSwipePurchaseId(null)}
    >
      <ScreenShell
        subtitle="Track spending for the current paycheck cycle."
        title="Purchases"
      />

      <TutorialTarget id="purchases-summary">
        <CycleSummaryCard
          summary={formatPurchaseCycleHeaderSummary({
            cycleWindowLabel: cycleLabel,
            pendingCount: pendingPurchaseCount,
            totalSpentCents: purchaseSummary.totalSpentCents,
          })}
        />
      </TutorialTarget>

      <TutorialTarget id="purchases-filters">
      <View style={styles.filterChipRow}>
        {purchaseFilters.map((filter) => (
          <Pressable
            key={filter}
            accessibilityLabel={getFilterLabel(filter, pendingPurchaseCount)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === filter }}
            style={({ pressed }) => [
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {getFilterLabel(filter, pendingPurchaseCount)}
            </Text>
          </Pressable>
        ))}
      </View>
      </TutorialTarget>

      {purchases.length === 0 && (
        <EmptyState
          actionLabel="Add purchase"
          body="Purchases you add today will appear here."
          title="No purchases yet"
          onAction={onAddPurchase}
        />
      )}

      {purchases.length > 0 && currentCyclePurchases.length === 0 && (
        <EmptyState
          title="No purchases in this cycle"
          body={
            hasOutsideCyclePurchases
              ? "Purchases outside this cycle are listed below."
              : "Add a purchase or browse previous cycles below."
          }
        />
      )}

      {purchases.length > 0 &&
        currentCyclePurchases.length > 0 &&
        filteredPurchases.length === 0 && (
          <EmptyState
            title={`No ${activeFilter.toLowerCase()} purchases`}
            body="Try another filter to see more transactions."
          />
        )}

      {filteredPurchases.length > 0 && renderPurchaseDateGroups(filteredPurchases)}

      {hasOutsideCyclePurchases && (
        <View style={styles.purchaseOutsideCycleSection}>
          <ScreenSectionTitle title="Outside any paycheck cycle" />
          <Text style={styles.purchaseOutsideCycleMeta}>
            {unassignedCycleOption?.transactionCount ?? outsideCyclePurchases.length}{" "}
            {(unassignedCycleOption?.transactionCount ??
              outsideCyclePurchases.length) === 1
              ? "purchase"
              : "purchases"}{" "}
            · {money(unassignedCycleOption?.totalSpentCents ?? 0)}
          </Text>

          {filteredOutsideCyclePurchases.length === 0 ? (
            <Text style={styles.rowMetaText}>
              No {activeFilter.toLowerCase()} purchases outside this cycle.
            </Text>
          ) : (
            renderPurchaseDateGroups(filteredOutsideCyclePurchases, "outside-")
          )}
        </View>
      )}

      {previousCycleOptions.length > 0 && (
        <View style={styles.purchasePastCycleSection}>
          <PreviousCyclesSection
            cycleCount={previousCycleOptions.length}
            isExpanded={showPreviousCycles}
            onToggle={togglePreviousCycles}
          />
          {showPreviousCycles && (
            <View style={styles.purchasePreviousCycleGroup}>
              {previousCycleOptions.map((option) => (
                <PreviousCycleRow
                  key={option.id}
                  cycleContext={cycleContext}
                  isExpanded={expandedCycleIds.has(option.id)}
                  option={option}
                  purchases={purchases}
                  visibleCount={
                    cycleVisibleCounts[option.id] ?? PREVIOUS_PURCHASES_PAGE_SIZE
                  }
                  onLoadMore={() => loadMoreCyclePurchases(option.id)}
                  onToggle={() => toggleCyclePurchases(option.id)}
                  renderPurchaseDateGroups={(cyclePurchases) =>
                    renderPurchaseDateGroups(cyclePurchases, `${option.id}-`)
                  }
                />
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
