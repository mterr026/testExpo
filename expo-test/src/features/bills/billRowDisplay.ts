import type { Bill } from "@/shared/ui/types";

export {
  getBillStatusLabel,
  getBillStatusPresentation,
  getBillStatusTone,
} from "@/shared/ui/statusBadges";

export function getBillRowMeta(bill: Bill) {
  if (bill.status === "Scheduled") {
    return bill.billId ? "Recurring • Next cycle" : "One-time • Next cycle";
  }

  if (bill.status === "Projected") {
    return bill.billId ? "Recurring • Projected" : "One-time • Projected";
  }

  if (bill.status === "Paused") {
    return bill.billId ? "Recurring • Paused" : "One-time • Paused";
  }

  if (bill.billId) {
    return bill.isPaused ? "Recurring • Paused" : "Recurring";
  }

  return "One-time";
}

export function formatBillDueDateParts(date: string, status?: Bill["status"]) {
  if (status === "Paused") {
    return { day: "Pause", month: "" };
  }

  if (date === "Scheduled") {
    return { day: "", month: "Sched" };
  }

  const dayMatch = /^Day (\d+)$/.exec(date);

  if (dayMatch) {
    return { day: dayMatch[1], month: "Day" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { day: date.slice(0, 4), month: "" };
  }

  const [, month, day] = date.split("-");

  return {
    day: String(Number(day)),
    month: formatMonth(Number(month)),
  };
}

export function formatBillDisplayName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Bill";
  }

  const checkcardMatch = /^CHECKCARD\s+([^*]+?)(?:\s+\*.*)?$/i.exec(trimmed);

  if (checkcardMatch?.[1]) {
    return normalizeBillDisplayName(checkcardMatch[1].trim());
  }

  const beforeDescriptor = trimmed.split(/\s+DES:/i)[0]?.trim();

  return normalizeBillDisplayName(beforeDescriptor || trimmed);
}

function normalizeBillDisplayName(value: string) {
  const collapsed = value.replace(/\s{2,}/g, " ").trim();

  if (/^[A-Z0-9 .&'-]+$/.test(collapsed) && collapsed.length > 4) {
    return collapsed
      .toLowerCase()
      .replace(/\b([a-z])/g, (match) => match.toUpperCase());
  }

  return collapsed;
}

export function formatBillDisplayDate(date: string) {
  if (date === "Scheduled") {
    return "Scheduled";
  }

  const dayMatch = /^Day (\d+)$/.exec(date);

  if (dayMatch) {
    return `Day ${dayMatch[1]}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
}

function formatMonth(month: number) {
  return (
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
    ][month - 1] ?? ""
  );
}
