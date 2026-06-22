import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  ActionMenu,
  EmptyState,
  money,
  OverflowButton,
  StatusPill,
  type ActionMenuHeader,
  type ActionMenuItem,
  type StatusPillTone,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { PaycheckListItem, Purchase } from "@/shared/ui/types";

import {
  buildPurchaseCycleOptions,
  filterPurchasesForCycle,
  getArchivedPurchaseCycleOptions,
  getPurchaseSummaryForPurchases,
  type PurchaseCycleOption,
} from "./purchaseCycles";
import {
  getFilterLabel,
  getPurchaseSummaryTitle,
  PREVIOUS_PURCHASES_PAGE_SIZE,
  purchaseFilters,
  type PurchaseFilter,
} from "./purchaseScreenHelpers";

type PurchasesScreenProps = {
  purchases: Purchase[];
  activeCyclePaycheckId: string | null;
  activeCycleStartDate: string | null;
  activeCycleEndDate: string | null;
  paychecks: PaycheckListItem[];
  onDeletePurchase: (id: string) => void | Promise<void>;
  onEditPurchase: (purchase: Purchase) => void;
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
  onMarkCharged,
  onMarkPending,
}: PurchasesScreenProps) {
  const purchases = purchasesProp ?? [];
  const paychecks = paychecksProp ?? [];
  const [showPreviousCycles, setShowPreviousCycles] = useState(false);
  const [expandedCycleIds, setExpandedCycleIds] = useState<Set<string>>(
    () => new Set()
  );
  const [cycleVisibleCounts, setCycleVisibleCounts] = useState<
    Record<string, number>
  >({});
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [activeFilter, setActiveFilter] = useState<PurchaseFilter>("All");
  const cycleContext = {
    activeCyclePaycheckId,
    activeCycleStartDate,
    activeCycleEndDate,
    paychecks,
  };
  const cycleOptions = buildPurchaseCycleOptions(purchases, cycleContext);
  const activeCycleOption =
    cycleOptions.find((option) => option.id === activeCyclePaycheckId) ?? null;
  const currentCyclePurchases = activeCyclePaycheckId
    ? filterPurchasesForCycle(purchases, activeCyclePaycheckId, cycleContext)
    : [];
  const unassignedCycleOption =
    cycleOptions.find((option) => option.id === "unassigned") ?? null;
  const previousCycleOptions = [
    ...getArchivedPurchaseCycleOptions(cycleOptions),
    ...(unassignedCycleOption && unassignedCycleOption.transactionCount > 0
      ? [unassignedCycleOption]
      : []),
  ];
  const purchaseActions = selectedPurchase
    ? getPurchaseActions({
        purchase: selectedPurchase,
        onDeletePurchase,
        onEditPurchase,
        onMarkCharged,
        onMarkPending,
      })
    : [];
  const sortedCurrentPurchases = [...currentCyclePurchases].sort(sortPurchasesByMostRecent);
  const filteredPurchases = sortedCurrentPurchases.filter((purchase) =>
    activeFilter === "All" ? true : purchase.status === activeFilter
  );
  const purchaseSummary = getPurchaseSummaryForPurchases(currentCyclePurchases);
  const pendingPurchaseCount = currentCyclePurchases.filter(
    (purchase) => purchase.status === "Pending"
  ).length;

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
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.screenHeaderRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.sectionTitle}>Purchases</Text>
          <Text style={styles.helpText}>Spending this pay cycle.</Text>
        </View>
      </View>

      <View style={styles.purchaseSummaryCard}>
        <Text style={styles.dashboardHeroLabel}>{getPurchaseSummaryTitle()}</Text>
        {activeCycleOption?.cycleWindowLabel ? (
          <Text style={styles.purchaseSummaryCycleWindow}>
            {activeCycleOption.cycleWindowLabel}
          </Text>
        ) : null}
        <View style={styles.purchaseSummaryGrid}>
          <PurchaseSummaryMetric
            highlight
            label="Total Spent"
            value={money(purchaseSummary.totalSpentCents)}
          />
          <PurchaseSummaryMetric
            label="Pending"
            value={money(purchaseSummary.pendingAmountCents)}
          />
          <PurchaseSummaryMetric
            label="Transactions"
            value={String(purchaseSummary.transactionCount)}
          />
        </View>
      </View>

      <View style={styles.filterChipRow}>
        {purchaseFilters.map((filter) => (
          <Pressable
            key={filter}
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

      {purchases.length === 0 && (
        <EmptyState title="No purchases yet" body="Purchases you add today will appear here." />
      )}

      {purchases.length > 0 && currentCyclePurchases.length === 0 && (
        <EmptyState
          title="No purchases in this cycle"
          body="Add a purchase or browse previous cycles below."
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

      {filteredPurchases.length > 0 &&
        groupPurchasesByDate(filteredPurchases).map((group) => (
          <View key={group.dateKey} style={styles.transactionDateGroup}>
            <Text style={styles.transactionDateHeader}>{group.label}</Text>
            <View style={styles.transactionListGroup}>
              {group.purchases.map((purchase, index) => (
                <PurchaseTransactionRow
                  key={purchase.id}
                  purchase={purchase}
                  showDivider={index < group.purchases.length - 1}
                  onOpenActions={setSelectedPurchase}
                />
              ))}
            </View>
          </View>
        ))}

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
                  onOpenActions={setSelectedPurchase}
                  onToggle={() => toggleCyclePurchases(option.id)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <ActionMenu
        header={
          selectedPurchase ? getPurchaseActionHeader(selectedPurchase) : undefined
        }
        title={selectedPurchase?.name ?? "Purchase"}
        visible={!!selectedPurchase}
        actions={purchaseActions}
        onClose={() => setSelectedPurchase(null)}
      />
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
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.paycheckSectionToggle,
        pressed && styles.pressed,
      ]}
      onPress={onToggle}
    >
      <Text style={styles.paycheckCoverageTitle}>Previous cycles</Text>
      <Text style={styles.paycheckCoverageTotal}>
        {cycleCount} {cycleCount === 1 ? "cycle" : "cycles"}{" "}
        {isExpanded ? "⌃" : "⌄"}
      </Text>
    </Pressable>
  );
}

function PreviousCycleRow({
  cycleContext,
  isExpanded,
  option,
  purchases,
  visibleCount,
  onLoadMore,
  onOpenActions,
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
  visibleCount: number;
  onLoadMore: () => void;
  onOpenActions: (purchase: Purchase) => void;
  onToggle: () => void;
}) {
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
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.paycheckCoverageToggle,
          pressed && styles.pressed,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.paycheckCoverageTitle}>
          {isExpanded ? "Hide purchases" : "Show purchases"}
        </Text>
        <Text style={styles.paycheckCoverageTotal}>
          {option.transactionCount}{" "}
          {option.transactionCount === 1 ? "purchase" : "purchases"}{" "}
          {isExpanded ? "⌃" : "⌄"}
        </Text>
      </Pressable>
      {isExpanded && (
        <View style={styles.purchasePreviousCycleExpanded}>
          {cyclePurchases.length === 0 ? (
            <Text style={styles.rowMetaText}>No purchases in this cycle.</Text>
          ) : (
            <>
              {groupPurchasesByDate(visiblePurchases).map((group) => (
                <View key={group.dateKey} style={styles.transactionDateGroup}>
                  <Text style={styles.transactionDateHeader}>{group.label}</Text>
                  <View style={styles.transactionListGroup}>
                    {group.purchases.map((purchase, index) => (
                      <PurchaseTransactionRow
                        key={purchase.id}
                        purchase={purchase}
                        showDivider={index < group.purchases.length - 1}
                        onOpenActions={onOpenActions}
                      />
                    ))}
                  </View>
                </View>
              ))}
              {hasMorePurchases && (
                <Pressable
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

function PurchaseSummaryMetric({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.purchaseSummaryMetric}>
      <Text style={styles.purchaseSummaryLabel}>{label}</Text>
      <Text
        style={[
          styles.purchaseSummaryValue,
          highlight && styles.purchaseSummaryValueHighlight,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function PurchaseTransactionRow({
  onOpenActions,
  purchase,
  showDivider,
}: {
  onOpenActions: (purchase: Purchase) => void;
  purchase: Purchase;
  showDivider: boolean;
}) {
  const isPending = purchase.status === "Pending";

  return (
    <View
      style={[
        styles.purchaseTransactionRow,
        showDivider && styles.transactionRowDivider,
      ]}
    >
      <View style={styles.itemCopy}>
        <View style={styles.purchaseTitleRow}>
          <Text style={styles.transactionTitle}>{purchase.name}</Text>
          <StatusPill
            label={purchase.status}
            tone={getPurchaseStatusTone(purchase.status)}
          />
        </View>
      </View>
      <View style={styles.purchaseAmountColumn}>
        <Text
          style={[
            styles.purchaseAmount,
            isPending && styles.purchaseAmountPending,
          ]}
        >
          -{money(normalizePurchaseAmountCents(purchase.amountCents))}
        </Text>
        <OverflowButton onPress={() => onOpenActions(purchase)} />
      </View>
    </View>
  );
}

function normalizePurchaseAmountCents(amountCents: number | null | undefined): number {
  return typeof amountCents === "number" && Number.isInteger(amountCents)
    ? amountCents
    : 0;
}

function getPurchaseActionHeader(purchase: Purchase): ActionMenuHeader {
  return {
    amount: `-${money(normalizePurchaseAmountCents(purchase.amountCents))}`,
    meta: formatPurchaseRowDate(purchase.date),
    status: purchase.status,
    statusTone: getPurchaseStatusTone(purchase.status),
    title: purchase.name,
  };
}

function getPurchaseStatusTone(status: Purchase["status"]): StatusPillTone {
  return status === "Pending" ? "warning" : "neutral";
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

function formatPurchaseRowDate(date: string) {
  const dateKey = getPurchaseDateKey(date);

  if (dateKey === "Today" || dateKey === "Yesterday") {
    return dateKey;
  }

  return formatPurchaseDateLabel(dateKey);
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

function getPurchaseActions({
  purchase,
  onDeletePurchase,
  onEditPurchase,
  onMarkCharged,
  onMarkPending,
}: {
  purchase: Purchase;
  onDeletePurchase: (id: string) => void | Promise<void>;
  onEditPurchase: (purchase: Purchase) => void;
  onMarkCharged: (id: string) => void | Promise<void>;
  onMarkPending: (id: string) => void | Promise<void>;
}): ActionMenuItem[] {
  return [
    purchase.status === "Pending"
      ? {
          icon: "✓",
          label: "Mark Charged",
          onPress: () => {
            void onMarkCharged(purchase.id);
          },
        }
      : {
          icon: "⏳",
          label: "Mark Pending",
          onPress: () => {
            void onMarkPending(purchase.id);
          },
        },
    {
      icon: "✏️",
      label: "Edit Purchase",
      closeBeforeAction: true,
      onPress: () => onEditPurchase(purchase),
    },
    {
      icon: "🗑",
      label: "Delete Purchase",
      destructive: true,
      onPress: () => {
        void onDeletePurchase(purchase.id);
      },
    },
  ];
}
