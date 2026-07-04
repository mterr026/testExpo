import type { Cents } from "@/shared/currency";

export type PurchaseState = "charged" | "pending";
export type BillType = "fixed" | "variable";
export type BillRecurrenceInterval =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "custom";
export type PaycheckRecurrenceInterval =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly";

export type PaycheckCycleBoundaryInput = {
  expectedDate: string;
  recurrenceInterval: PaycheckRecurrenceInterval;
};

export type PaycheckCycleBoundary = {
  startDate: string;
  endDate: string;
  nextStartDate: string;
};

export type EngineBillDefinition = {
  id: string;
  billType: BillType;
  defaultAmountCents: Cents;
  recurrenceInterval: BillRecurrenceInterval;
  customIntervalDays?: number | null;
  dueDayOfCycle?: number | null;
  dueDateAbsolute?: string | null;
  endDate?: string | null;
  isPaused: boolean;
  deletedAt?: string | null;
};

export type BillCycleWindow = {
  paycheckCycleId: string;
  startDate: string;
  nextStartDate: string;
};

export type ExistingBillCycleInstanceIdentity = {
  billId: string;
  paycheckCycleId: string;
  dueDate: string;
  deletedAt?: string | null;
};

export type GeneratedBillCycleInstance = {
  billId: string;
  billType: BillType;
  paycheckCycleId: string;
  cycleAmountCents: Cents;
  isVariableConfirmed: boolean;
  isPaid: boolean;
  dueDate: string;
};

export type GenerateBillCycleInstancesInput = {
  bills: EngineBillDefinition[];
  cycle: BillCycleWindow;
  existingInstances?: ExistingBillCycleInstanceIdentity[];
};

export type ConfirmVariableBillInput = {
  bill: EngineBillDefinition;
  instance: GeneratedBillCycleInstance;
  confirmedAmountCents: Cents;
};

export type ConfirmVariableBillResult = {
  bill: EngineBillDefinition;
  instance: GeneratedBillCycleInstance;
};

export type ActivityLogEventType =
  | "purchase_added"
  | "purchase_updated"
  | "purchase_deleted"
  | "purchase_state_changed"
  | "paycheck_confirmed"
  | "paycheck_adjusted"
  | "paycheck_added"
  | "paycheck_deleted"
  | "bill_added"
  | "bill_updated"
  | "bill_paused"
  | "bill_resumed"
  | "bill_deleted"
  | "bill_paid"
  | "variable_bill_confirmed"
  | "balance_adjusted"
  | "reserve_updated"
  | "import_completed"
  | "backup_exported"
  | "backup_restored";

export type ActivityLogEntityType =
  | "purchase"
  | "paycheck"
  | "bill"
  | "bill_instance"
  | "balance"
  | "import"
  | "backup";

export type ActivityLogEntry = {
  id: string;
  profileId: string;
  eventType: ActivityLogEventType;
  entityType: ActivityLogEntityType;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
};

export type CreateActivityLogEntryInput = {
  profileId: string;
  eventType: ActivityLogEventType;
  entityType: ActivityLogEntityType;
  entityId?: string | null;
  summary?: string | null;
  idFactory?: () => string;
  now?: () => Date;
};

export type EnginePaycheck = {
  amountCents: Cents;
  expectedDate?: string;
  isReceived: boolean;
  receivedAt?: string | null;
  deletedAt?: string | null;
};

export type EnginePurchase = {
  amountCents: Cents;
  state: PurchaseState;
  deletedAt?: string | null;
};

export type EngineBillInstance = {
  cycleAmountCents: Cents;
  dueDate?: string;
  isPaid: boolean;
  paidAt?: string | null;
  deletedAt?: string | null;
};

export type EngineBalanceAdjustment = {
  deltaCents: Cents;
  deletedAt?: string | null;
};

export type SafeToSpendInput = {
  paychecks: EnginePaycheck[];
  purchases: EnginePurchase[];
  billInstances: EngineBillInstance[];
  balanceAdjustments: EngineBalanceAdjustment[];
  openingBalanceCents?: Cents;
  openingBalanceAsOfDate?: string | null;
  essentialReserveCents: Cents;
};

export type SafeToSpendBreakdown = {
  openingBalanceCents: Cents;
  confirmedIncomeCents: Cents;
  chargedPurchasesCents: Cents;
  pendingPurchasesCents: Cents;
  paidBillsCents: Cents;
  unpaidBillsCents: Cents;
  balanceAdjustmentsCents: Cents;
  runningBalanceCents: Cents;
  essentialReserveCents: Cents;
  safeToSpendCents: Cents;
};
