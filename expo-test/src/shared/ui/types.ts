export type Screen = "Dashboard" | "Purchases" | "Bills" | "Paychecks" | "Settings";

export type PaycheckRecurrenceInterval =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly";

export type PaycheckRecurrence = PaycheckRecurrenceInterval | "none";
export type BillRepeatMode = "recurring" | "one-time";

export type PaycheckIncomeRole = "primary" | "secondary";

export type PaycheckListItem = {
  id: string;
  label: string;
  amountCents: number;
  expectedDate: string;
  isReceived: boolean;
  isPrimary: boolean;
  recurrenceInterval: PaycheckRecurrenceInterval | null;
};

export type PaycheckBillReservationStatus = "paid" | "reserved" | "projected";

export type PaycheckBillCoverage = {
  billsImpactCents: number;
  canProjectBills: boolean;
  coveredBills: {
    amountCents: number;
    billId?: string;
    dueDate: string;
    id: string;
    name: string;
    reservationStatus?: PaycheckBillReservationStatus;
    status?: string;
  }[];
  isCurrentCycle: boolean;
  nextPaycheckDate: string | null;
  paycheckId: string;
  paycheckImpactCents: number;
  projectedSafeToSpendCents: number;
  startingSafeToSpendCents: number;
  totalCents: number;
};

export type NextCyclePreview = {
  amountCents: number;
  canProjectBills: boolean;
  expectedDate: string;
  pendingPurchasesCents: number;
  projectedBills: {
    amountCents: number;
    dueDate: string;
    id: string;
    name: string;
  }[];
  projectedBillsTotalCents: number;
  sourceName: string;
  startingSafeToSpendCents: number;
} | null;

export type Bill = {
  id: string;
  billId?: string;
  billType?: "fixed" | "variable";
  endDate?: string | null;
  isPaused?: boolean;
  name: string;
  amountCents: number;
  dueDate: string;
  status:
    | "Due"
    | "Paid"
    | "Needs confirmation"
    | "Paused"
    | "Scheduled"
    | "Projected";
};

export type Purchase = {
  id: string;
  name: string;
  amountCents: number;
  status: "Pending" | "Charged";
  date: string;
  purchaseDate: string;
  paycheckCycleId: string | null;
  envelopeId: string | null;
};
