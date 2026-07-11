import {
  getBillTimelineMetaLabel,
  getPaycheckTimelineMetaLabel,
} from "@/shared/ui/statusBadges";
import type { Bill, PaycheckListItem } from "@/shared/ui/types";

export type TimelineEvent = {
  id: string;
  amountCents: number;
  date: string;
  kind: "bill" | "income";
  status: string;
  title: string;
};

export function formatMonth(month: number) {
  return [
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
  ][month - 1] ?? "";
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatTimelineDateParts(date: string) {
  if (!isIsoDate(date)) {
    return { day: "—", month: "" };
  }

  const [, month, day] = date.split("-");

  return {
    day: String(Number(day)),
    month: formatMonth(Number(month)),
  };
}

export function formatTimelineDate(date: string) {
  if (!isIsoDate(date)) {
    return "Bill";
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
}

export function formatNextPaycheckLabel(label: string) {
  if (!isIsoDate(label)) {
    return label;
  }

  return formatTimelineDate(label);
}

export function formatTimelineStatus(event: TimelineEvent) {
  if (event.kind === "income") {
    return getPaycheckTimelineMetaLabel(event.status === "Received");
  }

  return getBillTimelineMetaLabel(event.status as Bill["status"]);
}

export function buildTimelineEvents(
  bills: Bill[],
  paychecks: PaycheckListItem[]
): TimelineEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const billEvents = bills
    .filter((bill) =>
      (bill.status === "Due" ||
        bill.status === "Needs confirmation" ||
        bill.status === "Scheduled" ||
        bill.status === "Projected")
    )
    .map<TimelineEvent>((bill) => ({
      id: `bill-${bill.id}`,
      amountCents: bill.amountCents,
      date: bill.dueDate,
      kind: "bill",
      status: bill.status,
      title: bill.name,
    }));
  const paycheckEvents = paychecks
    .filter((paycheck) => paycheck.expectedDate >= today)
    .map<TimelineEvent>((paycheck) => ({
      id: `paycheck-${paycheck.id}`,
      amountCents: paycheck.amountCents,
      date: paycheck.expectedDate,
      kind: "income",
      status: paycheck.isReceived ? "Received" : "Expected",
      title: paycheck.label,
    }));

  return [...billEvents, ...paycheckEvents].sort((first, second) => {
    const dateCompare = sortDate(first).localeCompare(sortDate(second));

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return first.kind.localeCompare(second.kind);
  });
}

export function sortDate(event: TimelineEvent) {
  if (isIsoDate(event.date)) {
    return event.date;
  }

  return event.kind === "bill" ? "9999-12-30" : "9999-12-31";
}
