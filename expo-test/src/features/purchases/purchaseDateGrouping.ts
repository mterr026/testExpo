import type { Purchase } from "@/shared/ui/types";

export function sortPurchasesByMostRecent(first: Purchase, second: Purchase) {
  const dateCompare = getPurchaseDateKey(second.date).localeCompare(
    getPurchaseDateKey(first.date)
  );

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return second.id.localeCompare(first.id);
}

export function groupPurchasesByDate(purchases: Purchase[]) {
  const groups: {
    dateKey: string;
    label: string;
    purchases: Purchase[];
  }[] = [];
  const purchasesByDate = new Map<string, Purchase[]>();

  for (const purchase of purchases) {
    const dateKey = getPurchaseDateKey(purchase.date);
    const existingGroup = purchasesByDate.get(dateKey);

    if (existingGroup) {
      existingGroup.push(purchase);
      continue;
    }

    purchasesByDate.set(dateKey, [purchase]);
  }

  for (const purchase of purchases) {
    const dateKey = getPurchaseDateKey(purchase.date);

    if (groups.some((group) => group.dateKey === dateKey)) {
      continue;
    }

    groups.push({
      dateKey,
      label: formatPurchaseGroupLabel(dateKey),
      purchases: purchasesByDate.get(dateKey) ?? [],
    });
  }

  return groups;
}

export function formatPurchaseGroupLabel(dateKey: string) {
  if (dateKey === "Today" || isSameIsoDate(dateKey, 0)) {
    return "Today";
  }

  if (dateKey === "Yesterday" || isSameIsoDate(dateKey, -1)) {
    return "Yesterday";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return formatPurchaseDate(dateKey);
  }

  return dateKey;
}

export function getPurchaseDateKey(date: string | null | undefined) {
  if (!date) {
    return "Unknown";
  }

  const isoDateMatch = date.match(/\d{4}-\d{2}-\d{2}/);

  if (isoDateMatch) {
    return isoDateMatch[0];
  }

  const parsedDate = new Date(date);

  if (!Number.isNaN(parsedDate.getTime())) {
    return formatIsoDate(parsedDate);
  }

  return date.trim();
}

export function formatPurchaseDateLabel(date: string) {
  if (isSameIsoDate(date, 0)) {
    return "Today";
  }

  if (isSameIsoDate(date, -1)) {
    return "Yesterday";
  }

  return formatPurchaseDate(date);
}

export function formatPurchaseDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
}

export function isSameIsoDate(date: string, dayOffset: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  return date === formatIsoDate(offsetToday(dayOffset));
}

export function offsetToday(dayOffset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);

  return date;
}

export function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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
