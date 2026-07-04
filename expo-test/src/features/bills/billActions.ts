import type { ActionMenuItem } from "@/shared/ui/components";
import type { Bill } from "@/shared/ui/types";

type BillActionHandlers = {
  onConfirmBill: (bill: Bill) => void;
  onDeleteBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void | Promise<void>;
  onMarkUnpaid: (bill: Bill) => void | Promise<void>;
  onToggleBillPaused: (bill: Bill) => void;
};

type BillSwipeActionHandlers = Pick<
  BillActionHandlers,
  "onConfirmBill" | "onEditBill" | "onMarkPaid" | "onMarkUnpaid"
>;

function getPrimaryBillActions({
  bill,
  onConfirmBill,
  onMarkPaid,
  onMarkUnpaid,
}: BillSwipeActionHandlers & { bill: Bill }): ActionMenuItem[] {
  const primaryActions: ActionMenuItem[] = [];

  if (bill.status === "Needs confirmation" && !bill.isPaused) {
    primaryActions.push({
      icon: "$",
      label: "Confirm amount",
      closeBeforeAction: true,
      onPress: () => onConfirmBill(bill),
    });
  }

  if (
    (bill.status === "Due" ||
      bill.status === "Scheduled" ||
      bill.status === "Projected") &&
    !bill.isPaused
  ) {
    primaryActions.push({
      icon: "✓",
      label: "Mark paid",
      closeBeforeAction: true,
      onPress: () => {
        void onMarkPaid(bill);
      },
    });
  }

  if (bill.status === "Paid") {
    primaryActions.push({
      icon: "↩",
      label: "Mark unpaid",
      closeBeforeAction: true,
      onPress: () => {
        void onMarkUnpaid(bill);
      },
    });
  }

  return primaryActions;
}

/** Swipe order: primary action sits closest to the row when swiping left. */
export function getBillSwipeActions(
  params: BillActionHandlers & { bill: Bill }
): ActionMenuItem[] {
  return buildBillActions(params);
}

function buildBillActions(
  params: BillActionHandlers & { bill: Bill }
): ActionMenuItem[] {
  const {
    bill,
    onConfirmBill,
    onDeleteBill,
    onEditBill,
    onMarkPaid,
    onMarkUnpaid,
    onToggleBillPaused,
  } = params;

  return [
    ...getPrimaryBillActions({
      bill,
      onConfirmBill,
      onEditBill,
      onMarkPaid,
      onMarkUnpaid,
    }),
    {
      icon: "✏️",
      label: "Edit Bill",
      closeBeforeAction: true,
      onPress: () => onEditBill(bill),
    },
    ...(bill.billId
      ? [
          {
            icon: bill.isPaused ? "▶️" : "⏸",
            label: bill.isPaused
              ? "Resume Recurring Bill"
              : "Pause Recurring Bill",
            closeBeforeAction: true,
            onPress: () => {
              void onToggleBillPaused(bill);
            },
          } as ActionMenuItem,
        ]
      : []),
    {
      icon: "🗑",
      label: "Delete Bill",
      destructive: true,
      closeBeforeAction: true,
      onPress: () => {
        void onDeleteBill(bill);
      },
    },
  ];
}
