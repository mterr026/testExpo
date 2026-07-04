import type { ActionMenuItem } from "@/shared/ui/components";
import type { Purchase } from "@/shared/ui/types";

type PurchaseActionHandlers = {
  onDeletePurchase: (id: string) => void | Promise<void>;
  onEditPurchase: (purchase: Purchase) => void;
  onMarkCharged: (id: string) => void | Promise<void>;
  onMarkPending: (id: string) => void | Promise<void>;
};

export function getPurchaseActions({
  purchase,
  onDeletePurchase,
  onEditPurchase,
  onMarkCharged,
  onMarkPending,
}: PurchaseActionHandlers & { purchase: Purchase }): ActionMenuItem[] {
  return [
    purchase.status === "Pending"
      ? {
          icon: "✓",
          label: "Mark Charged",
          onPress: () => {
            void onMarkCharged(purchase.id);
          },
        }
      : {
          icon: "⏳",
          label: "Mark Pending",
          onPress: () => {
            void onMarkPending(purchase.id);
          },
        },
    {
      icon: "✏️",
      label: "Edit Purchase",
      closeBeforeAction: true,
      onPress: () => onEditPurchase(purchase),
    },
    {
      icon: "🗑",
      label: "Delete Purchase",
      destructive: true,
      onPress: () => {
        void onDeletePurchase(purchase.id);
      },
    },
  ];
}

/** Swipe order: primary action sits closest to the row when swiping left. */
export function getPurchaseSwipeActions(
  params: PurchaseActionHandlers & { purchase: Purchase }
): ActionMenuItem[] {
  return getPurchaseActions(params);
}
