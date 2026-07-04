import { formatCurrency } from "@/shared/currency";

export function formatPurchaseCycleHeaderSummary({
  cycleWindowLabel,
  pendingCount,
  totalSpentCents,
}: {
  cycleWindowLabel: string | null;
  pendingCount: number;
  totalSpentCents: number;
}) {
  const segments = [
    cycleWindowLabel ?? "No active cycle",
    `${formatCurrency(totalSpentCents)} spent`,
  ];

  if (pendingCount > 0) {
    segments.push(`${pendingCount} pending`);
  }

  return segments.join(" · ");
}
