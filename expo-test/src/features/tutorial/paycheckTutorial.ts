import type { PaycheckBillCoverage, PaycheckListItem } from "@/shared/ui/types";

export function pickPaycheckIdForTutorialCoverage(
  paychecks: PaycheckListItem[],
  coverage: PaycheckBillCoverage[]
): string | null {
  if (paychecks.length === 0) {
    return null;
  }

  const coverageById = new Map(
    coverage.map((entry) => [entry.paycheckId, entry])
  );
  const currentCycle = coverage.find(
    (entry) =>
      entry.isCurrentCycle &&
      entry.canProjectBills &&
      entry.coveredBills.length > 0
  );

  if (currentCycle) {
    return currentCycle.paycheckId;
  }

  for (const paycheck of paychecks) {
    const entry = coverageById.get(paycheck.id);

    if (entry?.canProjectBills && entry.coveredBills.length > 0) {
      return paycheck.id;
    }
  }

  for (const paycheck of paychecks) {
    if (coverageById.has(paycheck.id)) {
      return paycheck.id;
    }
  }

  return paychecks[0]?.id ?? null;
}
