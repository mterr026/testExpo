import {
  computeRunningBalance,
  sumBalanceAdjustments,
  sumBillInstances,
  sumConfirmedIncome,
  sumPurchasesByState,
} from "./balance";
import type { SafeToSpendBreakdown, SafeToSpendInput } from "./types";

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendBreakdown {
  const openingBalanceCents = input.openingBalanceCents ?? 0;
  const confirmedIncomeCents = sumConfirmedIncome(input.paychecks);
  const chargedPurchasesCents = sumPurchasesByState(input.purchases, "charged");
  const pendingPurchasesCents = sumPurchasesByState(input.purchases, "pending");
  const paidBillsCents = sumBillInstances(input.billInstances, true);
  const unpaidBillsCents = sumBillInstances(input.billInstances, false);
  const balanceAdjustmentsCents = sumBalanceAdjustments(input.balanceAdjustments);

  const runningBalanceCents = computeRunningBalance({
    ...input,
    openingBalanceCents,
  });
  const safeToSpendCents =
    runningBalanceCents -
    unpaidBillsCents -
    input.essentialReserveCents;

  return {
    openingBalanceCents,
    confirmedIncomeCents,
    chargedPurchasesCents,
    pendingPurchasesCents,
    paidBillsCents,
    unpaidBillsCents,
    balanceAdjustmentsCents,
    runningBalanceCents,
    essentialReserveCents: input.essentialReserveCents,
    safeToSpendCents,
  };
}
