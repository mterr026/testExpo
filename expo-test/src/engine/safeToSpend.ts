import {
  computeRunningBalance,
  sumBalanceAdjustments,
  sumBillInstances,
  sumConfirmedIncome,
  sumPurchasesByState,
} from "./balance";
import type { SafeToSpendBreakdown, SafeToSpendInput } from "./types";

export function createEmptySafeToSpendBreakdown(
  essentialReserveCents = 0,
  openingBalanceCents = 0
): SafeToSpendBreakdown {
  return calculateSafeToSpend({
    paychecks: [],
    purchases: [],
    billInstances: [],
    balanceAdjustments: [],
    essentialReserveCents,
    openingBalanceCents,
  });
}

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendBreakdown {
  const openingBalanceCents = input.openingBalanceCents ?? 0;
  const confirmedIncomeCents = sumConfirmedIncome(
    input.paychecks,
    input.openingBalanceAsOfDate
  );
  const chargedPurchasesCents = sumPurchasesByState(input.purchases, "charged");
  const pendingPurchasesCents = sumPurchasesByState(input.purchases, "pending");
  const paidBillsCents = sumBillInstances(
    input.billInstances,
    true,
    input.openingBalanceAsOfDate
  );
  const unpaidBillsCents = sumBillInstances(input.billInstances, false);
  const balanceAdjustmentsCents = sumBalanceAdjustments(input.balanceAdjustments);

  const runningBalanceCents = computeRunningBalance({
    ...input,
    openingBalanceCents,
  });
  const envelopeReservedCents = input.envelopeReservedCents ?? 0;
  const safeToSpendCents =
    runningBalanceCents -
    unpaidBillsCents -
    input.essentialReserveCents -
    envelopeReservedCents;

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
    envelopeReservedCents,
    safeToSpendCents,
  };
}
