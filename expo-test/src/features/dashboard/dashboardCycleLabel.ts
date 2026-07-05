import { OPEN_ENDED_PAYCHECK_CYCLE_DATE } from "@/engine";

export function formatDashboardCycleLabel(
  startDate: string | null,
  endDate: string | null
) {
  if (!startDate) {
    return "No active cycle";
  }

  const startLabel = formatShortDate(startDate);

  if (!endDate || endDate === OPEN_ENDED_PAYCHECK_CYCLE_DATE) {
    return `${startLabel} onward`;
  }

  return `${startLabel} – ${formatShortDate(endDate)}`;
}

function formatShortDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [, month, day] = date.split("-");
  const monthLabel =
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][Number(month) - 1] ?? month;

  return `${monthLabel} ${Number(day)}`;
}
