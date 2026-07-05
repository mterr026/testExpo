import { Pressable, Text, View } from "react-native";

import { money } from "@/shared/ui/components";
import { CollapseChevron } from "@/shared/ui/CollapseChevron";
import { CollapsibleLinkToggle } from "@/shared/ui/CollapsibleLinkToggle";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { PaycheckBillCoverage } from "@/shared/ui/types";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";

type PaycheckCoveredBillsProps = {
  coverage: PaycheckBillCoverage | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  showTutorialTarget?: boolean;
  toggleStyle?: "caret" | "link";
};

export function PaycheckCoveredBills({
  coverage,
  isExpanded,
  onToggle,
  showTutorialTarget = false,
  toggleStyle = "link",
}: PaycheckCoveredBillsProps) {
  const styles = useStyles();
  if (!coverage) {
    return null;
  }

  if (coverage.coveredBills.length === 0) {
    return (
      <View style={styles.paycheckCoverageBlock}>
        <Text style={styles.rowMetaText}>
          No bills assigned to this paycheck cycle.
        </Text>
      </View>
    );
  }

  const coverageSummary =
    !coverage.canProjectBills
      ? "Needs next paycheck"
      : coverage.coveredBills.length === 1
      ? "1 bill"
      : `${coverage.coveredBills.length} bills`;
  const windowText = coverage.nextPaycheckDate
    ? `Bills due before ${formatDisplayDate(coverage.nextPaycheckDate)}`
    : "Bills due on or after this paycheck.";

  const toggleLabel =
    toggleStyle === "link"
      ? isExpanded
        ? "Hide bill breakdown"
        : "See how bills fit"
      : null;

  return (
    <View style={styles.paycheckCoverageBlock}>
      {coverage.canProjectBills && coverage.coveredBills.length > 0 && (
        <Text style={styles.paycheckCoverageSummaryText}>
          {coverageSummary} assigned • {money(coverage.totalCents)} reserved
        </Text>
      )}
      {isExpanded &&
        (showTutorialTarget ? (
          <TutorialTarget id="paychecks-coverage-breakdown">
            <PaycheckCoverageExpandedContent
              coverage={coverage}
              windowText={windowText}
            />
          </TutorialTarget>
        ) : (
          <PaycheckCoverageExpandedContent
            coverage={coverage}
            windowText={windowText}
          />
        ))}
      {toggleStyle === "link" ? (
        <CollapsibleLinkToggle
          accessibilityHint={
            isExpanded
              ? "Collapses the bill breakdown for this paycheck"
              : "Expands the bill breakdown for this paycheck"
          }
          accessibilityLabel={toggleLabel ?? "Toggle bill breakdown"}
          expanded={isExpanded}
          expandedLabel="Hide bill breakdown"
          collapsedLabel="See how bills fit"
          onToggle={onToggle}
        />
      ) : (
        <Pressable
          accessibilityHint={
            isExpanded
              ? "Collapses the bill breakdown for this paycheck"
              : "Expands the bill breakdown for this paycheck"
          }
          accessibilityLabel={
            isExpanded ? "Hide paycheck breakdown" : "Show paycheck breakdown"
          }
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.paycheckCoveredBillsToggle,
            pressed && styles.pressed,
          ]}
          onPress={onToggle}
        >
          <CollapseChevron expanded={isExpanded} />
        </Pressable>
      )}
    </View>
  );
}

function PaycheckCoverageExpandedContent({
  coverage,
  windowText,
}: {
  coverage: PaycheckBillCoverage;
  windowText: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.paycheckCoverageExpanded}>
      <Text style={styles.paycheckCoverageWindowText}>{windowText}</Text>
      {!coverage.canProjectBills ? (
        <Text style={styles.paycheckCoverageHelpText}>
          Add another expected paycheck after this one to calculate covered
          bills.
        </Text>
      ) : (
        <>
          <PaycheckProjectionBreakdown coverage={coverage} />
          <View style={styles.paycheckCoverageBillList}>
            {coverage.coveredBills.map((bill, index) => (
              <View
                key={bill.id}
                style={[
                  styles.paycheckCoverageBillRow,
                  index < coverage.coveredBills.length - 1 &&
                    styles.paycheckCoverageBillRowDivider,
                ]}
              >
                <View style={styles.itemCopy}>
                  <Text style={styles.paycheckCoverageName}>{bill.name}</Text>
                  <Text style={styles.rowMetaText}>
                    {formatPaycheckBillMeta(bill)}
                  </Text>
                </View>
                <Text style={styles.paycheckCoverageAmount}>
                  {money(bill.amountCents)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      {coverage.canProjectBills && (
        <>
          <View style={styles.paycheckCoverageBillListTotalRow}>
            <Text style={styles.paycheckCoverageTitle}>Total bills</Text>
            <Text style={styles.paycheckCoverageAmount}>
              {money(coverage.totalCents)}
            </Text>
          </View>
          <View style={styles.paycheckProjectionTotalRowPrimary}>
            <Text style={styles.paycheckProjectionTotalLabel}>
              Projected Safe to Spend
            </Text>
            <Text style={styles.paycheckProjectionTotalValue}>
              {money(coverage.projectedSafeToSpendCents)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function PaycheckProjectionBreakdown({
  coverage,
}: {
  coverage: PaycheckBillCoverage;
}) {
  const styles = useStyles();
  const reservedBillCount = coverage.coveredBills.filter(
    (bill) => bill.reservationStatus === "reserved"
  ).length;

  return (
    <View style={styles.paycheckProjectionBreakdown}>
      <Text style={styles.paycheckProjectionBreakdownHelp}>
        Based on today&apos;s Safe to Spend, which already includes pending
        purchases.
      </Text>
      <View style={styles.paycheckCoverageBillListTotalRow}>
        <Text style={styles.paycheckCoverageTitle}>Starting Safe to Spend</Text>
        <Text style={styles.paycheckCoverageAmount}>
          {money(coverage.startingSafeToSpendCents)}
        </Text>
      </View>
      {coverage.paycheckImpactCents > 0 && (
        <View style={styles.paycheckCoverageBillListTotalRow}>
          <Text style={styles.paycheckCoverageTitle}>Expected paycheck</Text>
          <Text
            style={[styles.paycheckCoverageAmount, styles.paycheckProjectionCredit]}
          >
            +{money(coverage.paycheckImpactCents)}
          </Text>
        </View>
      )}
      {coverage.billsImpactCents > 0 && (
        <View style={styles.paycheckCoverageBillListTotalRow}>
          <Text style={styles.paycheckCoverageTitle}>
            {coverage.isCurrentCycle
              ? "Unreserved bills this cycle"
              : "Bills this cycle"}
          </Text>
          <Text
            style={[styles.paycheckCoverageAmount, styles.paycheckProjectionDeduction]}
          >
            -{money(coverage.billsImpactCents)}
          </Text>
        </View>
      )}
      {coverage.isCurrentCycle && reservedBillCount > 0 && (
        <Text style={styles.paycheckProjectionBreakdownHelp}>
          {reservedBillCount === 1
            ? "1 bill is already reserved in Safe to Spend and is not subtracted again."
            : `${reservedBillCount} bills are already reserved in Safe to Spend and are not subtracted again.`}
        </Text>
      )}
    </View>
  );
}

function formatPaycheckBillMeta(
  bill: PaycheckBillCoverage["coveredBills"][number]
) {
  if (bill.status === "Paid" || bill.reservationStatus === "paid") {
    return "Paid";
  }

  if (bill.reservationStatus === "reserved") {
    return `In Safe to Spend • Due ${formatDisplayDate(bill.dueDate)}`;
  }

  if (bill.reservationStatus === "projected") {
    return `Projected • Due ${formatDisplayDate(bill.dueDate)}`;
  }

  return `Due ${formatDisplayDate(bill.dueDate)}`;
}

function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
