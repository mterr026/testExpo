import { useState, type ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  EmptyState,
  money,
} from "@/shared/ui/components";
import { CollapseChevron } from "@/shared/ui/CollapseChevron";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
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
  type PurchaseCycleOption,
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
import { formatPurchaseCycleHeaderSummary } from "./purchaseCycleHeader";

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

function PreviousCyclesSection({
  cycleCount,
  isExpanded,
  onToggle,
}: {
  cycleCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleSection
      accessibilityHint={
        isExpanded ? "Collapses previous purchase cycles" : "Expands previous purchase cycles"
      }
      accessibilityLabel="Previous cycles"
      detail={`${cycleCount} ${cycleCount === 1 ? "cycle" : "cycles"}`}
      expanded={isExpanded}
      title="Previous cycles"
      onToggle={onToggle}
    />
  );
}

function PreviousCycleRow({
  cycleContext,
  isExpanded,
  option,
  purchases,
  renderPurchaseDateGroups,
  visibleCount,
  onLoadMore,
  onToggle,
}: {
  cycleContext: {
    activeCyclePaycheckId: string | null;
    activeCycleStartDate: string | null;
    activeCycleEndDate: string | null;
    paychecks: PaycheckListItem[];
  };
  isExpanded: boolean;
  option: PurchaseCycleOption;
  purchases: Purchase[];
  renderPurchaseDateGroups: (purchaseList: Purchase[]) => ReactElement[];
  visibleCount: number;
  onLoadMore: () => void;
  onToggle: () => void;
}) {
  const styles = useStyles();
  const cyclePurchases = [...filterPurchasesForCycle(purchases, option.id, cycleContext)].sort(
    sortPurchasesByMostRecent
  );
  const visiblePurchases = cyclePurchases.slice(0, visibleCount);
  const hasMorePurchases = cyclePurchases.length > visibleCount;
  const isUnassigned = option.id === "unassigned";

  return (
    <View style={styles.purchasePreviousCycleRow}>
      <View style={styles.purchasePreviousCycleHeader}>
        <View style={styles.itemCopy}>
          <Text style={styles.purchasePreviousCycleTitle}>
            {option.cycleWindowLabel}
          </Text>
          <Text style={styles.purchasePreviousCycleMeta}>
            {isUnassigned
              ? `${option.transactionCount} ${
                  option.transactionCount === 1 ? "purchase" : "purchases"
                }`
              : `${option.paycheckDateLabel} paycheck · ${option.transactionCount} ${
                  option.transactionCount === 1 ? "purchase" : "purchases"
                }`}
          </Text>
        </View>
        <Text style={styles.purchasePreviousCycleAmount}>
          {money(option.totalSpentCents)}
        </Text>
      </View>
      <Pressable
        accessibilityHint={
          isExpanded ? "Hides purchases for this cycle" : "Shows purchases for this cycle"
        }
        accessibilityLabel={isExpanded ? "Hide purchases" : "Show purchases"}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={({ pressed }) => [
          styles.paycheckCoverageToggle,
          pressed && styles.pressed,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.paycheckCoverageTitle}>
          {isExpanded ? "Hide purchases" : "Show purchases"}
        </Text>
        <View style={styles.paycheckCoverageTotalRow}>
          <Text style={styles.paycheckCoverageTotal}>
            {option.transactionCount}{" "}
            {option.transactionCount === 1 ? "purchase" : "purchases"}
          </Text>
          <CollapseChevron expanded={isExpanded} />
        </View>
      </Pressable>
      {isExpanded && (
        <View style={styles.purchasePreviousCycleExpanded}>
          {cyclePurchases.length === 0 ? (
            <Text style={styles.rowMetaText}>No purchases in this cycle.</Text>
          ) : (
            <>
              {renderPurchaseDateGroups(visiblePurchases)}
              {hasMorePurchases && (
                <Pressable
                  accessibilityLabel="Load more purchases"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={onLoadMore}
                >
                  <Text style={styles.secondaryButtonText}>Load more</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function sortPurchasesByMostRecent(first: Purchase, second: Purchase) {
  const dateCompare = getPurchaseDateKey(second.date).localeCompare(
    getPurchaseDateKey(first.date)
  );

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return second.id.localeCompare(first.id);
}

function groupPurchasesByDate(purchases: Purchase[]) {
  const groups: {
    dateKey: string;
    label: string;
    purchases: Purchase[];
  }[] = [];
  const purchasesByDate = new Map<string, Purchase[]>();

  for (const purchase of purchases) {
    const dateKey = getPurchaseDateKey(purchase.date);
    const existingGroup = purchasesByDate.get(dateKey);

    if (existingGroup) {
      existingGroup.push(purchase);
      continue;
    }

    purchasesByDate.set(dateKey, [purchase]);
  }

  for (const purchase of purchases) {
    const dateKey = getPurchaseDateKey(purchase.date);

    if (groups.some((group) => group.dateKey === dateKey)) {
      continue;
    }

    groups.push({
      dateKey,
      label: formatPurchaseGroupLabel(dateKey),
      purchases: purchasesByDate.get(dateKey) ?? [],
    });
  }

  return groups;
}

function formatPurchaseGroupLabel(dateKey: string) {
  if (dateKey === "Today" || isSameIsoDate(dateKey, 0)) {
    return "Today";
  }

  if (dateKey === "Yesterday" || isSameIsoDate(dateKey, -1)) {
    return "Yesterday";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return formatPurchaseDate(dateKey);
  }

  return dateKey;
}

function getPurchaseDateKey(date: string | null | undefined) {
  if (!date) {
    return "Unknown";
  }

  const isoDateMatch = date.match(/\d{4}-\d{2}-\d{2}/);

  if (isoDateMatch) {
    return isoDateMatch[0];
  }

  const parsedDate = new Date(date);

  if (!Number.isNaN(parsedDate.getTime())) {
    return formatIsoDate(parsedDate);
  }

  return date.trim();
}

function formatPurchaseDateLabel(date: string) {
  if (isSameIsoDate(date, 0)) {
    return "Today";
  }

  if (isSameIsoDate(date, -1)) {
    return "Yesterday";
  }

  return formatPurchaseDate(date);
}

function formatPurchaseDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
}

function isSameIsoDate(date: string, dayOffset: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  return date === formatIsoDate(offsetToday(dayOffset));
}

function offsetToday(dayOffset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);

  return date;
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMonth(month: number) {
  return [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][month - 1] ?? "";
}
