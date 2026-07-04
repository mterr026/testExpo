import type { ActionMenuItem } from "@/shared/ui/components";
import type { PaycheckListItem } from "@/shared/ui/types";

type PaycheckActionHandlers = {
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
};

export function getPaycheckActions({
  paycheck,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
}: PaycheckActionHandlers & { paycheck: PaycheckListItem }): ActionMenuItem[] {
  if (paycheck.isReceived) {
    return [
      {
        icon: "↩",
        label: "Mark unreceived",
        onPress: () => {
          void onMarkPaycheckUnreceived(paycheck.id);
        },
      },
      {
        icon: "✏️",
        label: "Edit Paycheck",
        closeBeforeAction: true,
        onPress: () => onEditPaycheck(paycheck),
      },
      {
        icon: "🗑",
        label: paycheck.recurrenceInterval
          ? "Delete Recurring Paychecks"
          : "Delete Paycheck",
        destructive: true,
        onPress: () => {
          void onDeletePaycheck(paycheck.id);
        },
      },
    ];
  }

  return [
    {
      icon: "✓",
      label: "Confirm received",
      onPress: () => {
        void onConfirmPaycheck(paycheck.id);
      },
    },
    {
      icon: "✏️",
      label: "Edit Paycheck",
      closeBeforeAction: true,
      onPress: () => onEditPaycheck(paycheck),
    },
    {
      icon: "🗑",
      label: paycheck.recurrenceInterval
        ? "Delete Recurring Paychecks"
        : "Delete Paycheck",
      destructive: true,
      onPress: () => {
        void onDeletePaycheck(paycheck.id);
      },
    },
  ];
}

/** Swipe order: primary action sits closest to the row when swiping left. */
export function getPaycheckSwipeActions(
  params: PaycheckActionHandlers & { paycheck: PaycheckListItem }
): ActionMenuItem[] {
  return getPaycheckActions(params);
}
