import { View } from "react-native";

import { ScreenSectionTitle } from "@/shared/ui/ScreenSectionTitle";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { PaycheckBillCoverage, PaycheckListItem } from "@/shared/ui/types";

import { PaycheckTimelineRow } from "./PaycheckTimelineRow";

export function PaycheckScheduleGroup({
  coverageByPaycheckId,
  expandedCoverageIds,
  openSwipePaycheckId,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onToggleCoverage,
  paychecks,
  showTutorialCoverageTarget = false,
  showTutorialSwipeTarget = false,
  tutorialFocusedPaycheckId = null,
  title,
}: {
  coverageByPaycheckId: Map<string, PaycheckBillCoverage>;
  expandedCoverageIds: Set<string>;
  openSwipePaycheckId: string | null;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: (paycheckId: string) => void;
  onSwipeOpen: (paycheckId: string) => void;
  onToggleCoverage: (paycheckId: string) => void;
  paychecks: PaycheckListItem[];
  showTutorialCoverageTarget?: boolean;
  showTutorialSwipeTarget?: boolean;
  tutorialFocusedPaycheckId?: string | null;
  title: string;
}) {
  const styles = useStyles();
  if (paychecks.length === 0) {
    return null;
  }

  return (
    <>
      {!!title && <ScreenSectionTitle title={title} />}
      <View style={styles.paycheckTimelineGroup}>
        {paychecks.map((paycheck) => (
          <PaycheckTimelineRow
            key={paycheck.id}
            coverage={coverageByPaycheckId.get(paycheck.id)}
            expandedCoverageIds={expandedCoverageIds}
            isSwipeOpen={openSwipePaycheckId === paycheck.id}
            paycheck={paycheck}
            showTutorialCoverageTarget={showTutorialCoverageTarget}
            showTutorialSwipeTarget={
              showTutorialSwipeTarget &&
              paycheck.id === tutorialFocusedPaycheckId
            }
            onConfirmPaycheck={onConfirmPaycheck}
            onDeletePaycheck={onDeletePaycheck}
            onEditPaycheck={onEditPaycheck}
            onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
            onSwipeClose={() => onSwipeClose(paycheck.id)}
            onSwipeOpen={onSwipeOpen}
            onToggleCoverage={onToggleCoverage}
          />
        ))}
      </View>
    </>
  );
}
