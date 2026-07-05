import type { Purchase } from "@/shared/ui/types";

const DEFAULT_DESCRIPTION = "Purchase";

export function getRecentPurchaseDescriptions(
  purchases: Purchase[],
  limit = 8
): string[] {
  const seen = new Set<string>();
  const descriptions: string[] = [];

  for (const purchase of [...purchases].sort(sortPurchasesByMostRecent)) {
    const description = purchase.name.trim();

    if (!description || description === DEFAULT_DESCRIPTION) {
      continue;
    }

    const normalized = description.toLowerCase();

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    descriptions.push(description);

    if (descriptions.length >= limit) {
      break;
    }
  }

  return descriptions;
}

function sortPurchasesByMostRecent(first: Purchase, second: Purchase) {
  const dateCompare = getPurchaseDateKey(second.date).localeCompare(
    getPurchaseDateKey(first.date)
  );

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return second.id.localeCompare(first.id);
}

function getPurchaseDateKey(date: string | null | undefined) {
  if (!date) {
    return "";
  }

  const isoDateMatch = date.match(/\d{4}-\d{2}-\d{2}/);

  if (isoDateMatch) {
    return isoDateMatch[0];
  }

  if (date === "Today" || date === "Yesterday") {
    return date;
  }

  return date.trim();
}
