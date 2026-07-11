import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import type { PaycheckBillCoverage, PaycheckListItem } from "@/shared/ui/types";

import { PaycheckScheduleGroup } from "./PaycheckScheduleGroup";

export function PreviousPaychecksSection({
  coverageByPaycheckId,
  expandedCoverageIds,
  isExpanded,
  openSwipePaycheckId,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onToggle,
  onToggleCoverage,
  paychecks,
}: {
  coverageByPaycheckId: Map<string, PaycheckBillCoverage>;
  expandedCoverageIds: Set<string>;
  isExpanded: boolean;
  openSwipePaycheckId: string | null;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: (paycheckId: string) => void;
  onSwipeOpen: (paycheckId: string) => void;
  onToggle: () => void;
  onToggleCoverage: (paycheckId: string) => void;
  paychecks: PaycheckListItem[];
}) {
  if (paychecks.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection
      accessibilityHint={
        isExpanded ? "Collapses previous paychecks" : "Expands previous paychecks"
      }
      accessibilityLabel="Previous paychecks"
      detail={`${paychecks.length} ${paychecks.length === 1 ? "paycheck" : "paychecks"}`}
      expanded={isExpanded}
      title="Previous paychecks"
      onToggle={onToggle}
    >
      <PaycheckScheduleGroup
        coverageByPaycheckId={coverageByPaycheckId}
        expandedCoverageIds={expandedCoverageIds}
        openSwipePaycheckId={openSwipePaycheckId}
        onConfirmPaycheck={onConfirmPaycheck}
        onDeletePaycheck={onDeletePaycheck}
        onEditPaycheck={onEditPaycheck}
        onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
        onSwipeClose={onSwipeClose}
        onSwipeOpen={onSwipeOpen}
        onToggleCoverage={onToggleCoverage}
        paychecks={paychecks}
        title=""
      />
    </CollapsibleSection>
  );
}
