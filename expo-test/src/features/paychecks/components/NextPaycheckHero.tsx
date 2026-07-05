import { Text, View } from "react-native";

import { money } from "@/shared/ui/components";
import { useStyles } from "@/shared/ui/ThemeContext";
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
  const styles = useStyles();
  return (
    <View style={styles.paycheckNextHeroSection}>
      <View style={styles.paycheckNextHeroCard}>
        <PaycheckTimelineRow
          coverage={coverage}
          expandedCoverageIds={expandedCoverageIds}
          isSwipeOpen={isSwipeOpen}
          paycheck={paycheck}
          showTutorialCoverageTarget={showTutorialCoverageTarget}
          showTutorialSwipeTarget={showTutorialSwipeTarget}
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
        <View style={styles.paycheckNextHeroStatsBar}>
          <Text style={styles.paycheckNextHeroStatsLine}>
            {money(receivedTotalCents)} received • {upcomingCount} upcoming
          </Text>
        </View>
      </View>
    </View>
  );
}
