import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";

import { CollapseChevron } from "@/shared/ui/CollapseChevron";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import { money } from "@/shared/ui/components";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { PaycheckListItem, Purchase } from "@/shared/ui/types";

import {
  filterPurchasesForCycle,
  type PurchaseCycleOption,
} from "../purchaseCycles";
import { sortPurchasesByMostRecent } from "../purchaseDateGrouping";

export function PreviousCyclesSection({
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

export function PreviousCycleRow({
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
