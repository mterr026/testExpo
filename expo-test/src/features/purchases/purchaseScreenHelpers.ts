export type PurchaseFilter = "All" | "Pending" | "Charged";

export const purchaseFilters: PurchaseFilter[] = ["All", "Pending", "Charged"];

export const PREVIOUS_PURCHASES_PAGE_SIZE = 10;

export function getPurchaseSummaryTitle() {
  return "This Cycle";
}

export function getFilterLabel(filter: PurchaseFilter, pendingCount: number) {
  if (filter === "Pending" && pendingCount > 0) {
    return `Pending (${pendingCount})`;
  }

  return filter;
}
