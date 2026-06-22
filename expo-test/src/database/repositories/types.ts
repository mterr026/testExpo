export type QueryParameters = readonly unknown[];

export type DatabaseExecutor = {
  getFirstAsync<T>(source: string, params?: QueryParameters): Promise<T | null>;
  getAllAsync<T>(source: string, params?: QueryParameters): Promise<T[]>;
  runAsync(source: string, params?: QueryParameters): Promise<unknown>;
};

export type TransactionExecutor = DatabaseExecutor;

export type TransactionalDatabaseExecutor = DatabaseExecutor & {
  withExclusiveTransactionAsync<T>(
    task: (transaction: TransactionExecutor) => Promise<T>
  ): Promise<T>;
};

export type IdFactory = () => string;
export type Clock = () => Date;

export type SyncStatus = "local" | "pending" | "synced";
export type SyncQueueEntityType =
  | "profile"
  | "paycheck"
  | "bill"
  | "bill_cycle_instance"
  | "purchase"
  | "balance_adjustment"
  | "notification_settings";
export type SyncQueueOperation = "create" | "update" | "delete";

export type SyncQueueEntry = {
  id: string;
  profileId: string;
  entityType: SyncQueueEntityType;
  entityId: string;
  operation: SyncQueueOperation;
  payloadJson: string;
  status: "pending" | "syncing" | "synced" | "failed";
  attemptCount: number;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type NewSyncQueueEntry = {
  profileId: string;
  entityType: SyncQueueEntityType;
  entityId: string;
  operation: SyncQueueOperation;
  payload: unknown;
};

export type Profile = {
  id: string;
  displayName: string | null;
  essentialReserveCents: number;
  currencyCode: string;
  onboardingComplete: boolean;
  openingBalanceCents: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
};

export type NewProfile = {
  displayName?: string | null;
  essentialReserveCents?: number;
  currencyCode?: string;
  onboardingComplete?: boolean;
  openingBalanceCents?: number;
};

export type ProfileChanges = Partial<
  Pick<
    Profile,
    | "displayName"
    | "essentialReserveCents"
    | "currencyCode"
    | "onboardingComplete"
    | "openingBalanceCents"
  >
>;

export type PaycheckRecurrenceInterval =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly";

export type Paycheck = {
  id: string;
  profileId: string;
  label: string | null;
  amountCents: number;
  expectedDate: string;
  isReceived: boolean;
  receivedAt: string | null;
  isRecurring: boolean;
  recurrenceInterval: PaycheckRecurrenceInterval | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
};

export type NewPaycheck = {
  profileId: string;
  label?: string | null;
  amountCents: number;
  expectedDate: string;
  isReceived?: boolean;
  receivedAt?: string | null;
  isRecurring?: boolean;
  recurrenceInterval?: PaycheckRecurrenceInterval | null;
  isPrimary?: boolean;
  notes?: string | null;
};

export type PaycheckChanges = Partial<
  Pick<
    Paycheck,
    | "label"
    | "amountCents"
    | "expectedDate"
    | "isReceived"
    | "receivedAt"
    | "isRecurring"
    | "recurrenceInterval"
    | "isPrimary"
    | "notes"
  >
>;

export type PaycheckCycleAssignment = {
  cycleAnchor: Paycheck;
  nextCycleAnchor: Paycheck | null;
};

export type BillType = "fixed" | "variable";
export type BillRecurrenceInterval =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "custom";

export type Bill = {
  id: string;
  profileId: string;
  name: string;
  billType: BillType;
  defaultAmountCents: number;
  recurrenceInterval: BillRecurrenceInterval;
  customIntervalDays: number | null;
  dueDayOfCycle: number | null;
  dueDateAbsolute: string | null;
  endDate: string | null;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
};

export type NewBill = {
  profileId: string;
  name: string;
  billType: BillType;
  defaultAmountCents: number;
  recurrenceInterval: BillRecurrenceInterval;
  customIntervalDays?: number | null;
  dueDayOfCycle?: number | null;
  dueDateAbsolute?: string | null;
  endDate?: string | null;
  isPaused?: boolean;
};

export type BillChanges = Partial<
  Pick<
    Bill,
    | "name"
    | "billType"
    | "defaultAmountCents"
    | "recurrenceInterval"
    | "customIntervalDays"
    | "dueDayOfCycle"
    | "dueDateAbsolute"
    | "endDate"
    | "isPaused"
  >
>;

export type BillCycleInstance = {
  id: string;
  billId: string;
  paycheckCycleId: string;
  cycleAmountCents: number;
  isVariableConfirmed: boolean;
  isPaid: boolean;
  paidAt: string | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
};

export type NewBillCycleInstance = {
  billId: string;
  paycheckCycleId: string;
  cycleAmountCents: number;
  isVariableConfirmed?: boolean;
  isPaid?: boolean;
  paidAt?: string | null;
  dueDate: string;
};

export type BillCycleInstanceChanges = Partial<
  Pick<
    BillCycleInstance,
    | "cycleAmountCents"
    | "isVariableConfirmed"
    | "isPaid"
    | "paidAt"
    | "dueDate"
  >
>;

export type PurchaseState = "charged" | "pending";

export type Purchase = {
  id: string;
  profileId: string;
  amountCents: number;
  state: PurchaseState;
  description: string | null;
  purchaseDate: string;
  paycheckCycleId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
};

export type NewPurchase = {
  profileId: string;
  amountCents: number;
  state?: PurchaseState;
  description?: string | null;
  purchaseDate: string;
  paycheckCycleId?: string | null;
  resolvedAt?: string | null;
};

export type PurchaseChanges = Partial<
  Pick<
    Purchase,
    | "amountCents"
    | "state"
    | "description"
    | "purchaseDate"
    | "paycheckCycleId"
    | "resolvedAt"
  >
>;

export type BalanceAdjustment = {
  id: string;
  profileId: string;
  previousBalanceCents: number;
  adjustedBalanceCents: number;
  deltaCents: number;
  reason: string | null;
  createdAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
};

export type NewBalanceAdjustment = {
  profileId: string;
  previousBalanceCents: number;
  adjustedBalanceCents: number;
  reason?: string | null;
};

export type NotificationSettings = {
  id: string;
  profileId: string;
  notificationsEnabled: boolean;
  pendingPurchaseReminder: boolean;
  pendingReminderDays: number;
  lowBalanceAlert: boolean;
  upcomingBillReminder: boolean;
  billReminderDaysBefore: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type NewNotificationSettings = {
  profileId: string;
  notificationsEnabled?: boolean;
  pendingPurchaseReminder?: boolean;
  pendingReminderDays?: number;
  lowBalanceAlert?: boolean;
  upcomingBillReminder?: boolean;
  billReminderDaysBefore?: number;
};

export type NotificationSettingsChanges = Partial<
  Pick<
    NotificationSettings,
    | "notificationsEnabled"
    | "pendingPurchaseReminder"
    | "pendingReminderDays"
    | "lowBalanceAlert"
    | "upcomingBillReminder"
    | "billReminderDaysBefore"
  >
>;

export type ImportSuggestionInterval =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "irregular";
export type ImportSuggestionKind = "bill" | "income";
export type ImportSuggestionStatus = "pending" | "confirmed" | "rejected";

export type ImportSuggestion = {
  id: string;
  profileId: string;
  suggestedName: string;
  suggestedAmountCents: number;
  suggestionKind: ImportSuggestionKind;
  suggestedDate: string | null;
  detectedInterval: ImportSuggestionInterval;
  occurrenceCount: number;
  importSessionId: string;
  status: ImportSuggestionStatus;
  confirmedBillId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  deletedAt: string | null;
};

export type NewImportSuggestion = {
  profileId: string;
  suggestedName: string;
  suggestedAmountCents: number;
  suggestionKind?: ImportSuggestionKind;
  suggestedDate?: string | null;
  detectedInterval: ImportSuggestionInterval;
  occurrenceCount: number;
  importSessionId: string;
};

export type BackupMetadataEventType = "export" | "restore";

export type BackupMetadata = {
  id: string;
  profileId: string;
  eventType: BackupMetadataEventType;
  fileName: string | null;
  recordCount: number | null;
  createdAt: string;
};

export type NewBackupMetadata = {
  profileId: string;
  eventType: BackupMetadataEventType;
  fileName?: string | null;
  recordCount?: number | null;
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

export type NewActivityLogEntry = {
  profileId: string;
  eventType: ActivityLogEventType;
  entityType: ActivityLogEntityType;
  entityId?: string | null;
  summary?: string | null;
};
