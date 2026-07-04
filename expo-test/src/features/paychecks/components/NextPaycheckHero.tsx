import { Text, View } from "react-native";

import { money } from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { PaycheckBillCoverage, PaycheckListItem } from "@/shared/ui/types";

import { PaycheckTimelineRow } from "./PaycheckTimelineRow";

type NextPaycheckHeroProps = {
  coverage: PaycheckBillCoverage | undefined;
  expandedCoverageIds: Set<string>;
  isSwipeOpen: boolean;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: () => void;
  onSwipeOpen: (paycheckId: string) => void;
  onToggleCoverage: (paycheckId: string) => void;
  paycheck: PaycheckListItem;
  receivedTotalCents: number;
  showTutorialCoverageTarget?: boolean;
  showTutorialSwipeTarget?: boolean;
  showTutorialUpcomingTarget?: boolean;
  upcomingCount: number;
};

export function NextPaycheckHero({
  coverage,
  expandedCoverageIds,
  isSwipeOpen,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onToggleCoverage,
  paycheck,
  receivedTotalCents,
  showTutorialCoverageTarget = false,
  showTutorialSwipeTarget = false,
  showTutorialUpcomingTarget = false,
  upcomingCount,
}: NextPaycheckHeroProps) {
  return (
    <View style={styles.paycheckNextHeroSection}>
      <PaycheckTimelineRow
        coverage={coverage}
        expandedCoverageIds={expandedCoverageIds}
        isSwipeOpen={isSwipeOpen}
        paycheck={paycheck}
        showTutorialCoverageTarget={showTutorialCoverageTarget}
        showTutorialSwipeTarget={showTutorialSwipeTarget}
        toggleStyle="link"
        variant="hero"
        wrapUpcomingTutorialTarget={showTutorialUpcomingTarget}
        onConfirmPaycheck={onConfirmPaycheck}
        onDeletePaycheck={onDeletePaycheck}
        onEditPaycheck={onEditPaycheck}
        onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
        onSwipeClose={onSwipeClose}
        onSwipeOpen={onSwipeOpen}
        onToggleCoverage={onToggleCoverage}
      />
      <Text style={styles.paycheckNextHeroStatsLine}>
        {money(receivedTotalCents)} received • {upcomingCount} upcoming
      </Text>
    </View>
  );
}
