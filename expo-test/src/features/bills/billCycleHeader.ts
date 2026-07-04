import { formatCurrency } from "@/shared/currency";

export function formatBillCycleHeaderSummary({
  cycleWindowLabel,
  confirmCount,
  totalDueCents,
}: {
  cycleWindowLabel: string | null;
  confirmCount: number;
  totalDueCents: number;
}) {
  const segments = [
    cycleWindowLabel ?? "No active cycle",
    `${formatCurrency(totalDueCents)} due`,
  ];

  if (confirmCount > 0) {
    segments.push(
      `${confirmCount} ${confirmCount === 1 ? "needs" : "need"} confirmation`
    );
  }

  return segments.join(" · ");
}
