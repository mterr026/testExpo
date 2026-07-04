import type {
  ActivityLogEntry,
  BalanceAdjustment,
  BackupMetadata,
  Bill,
  BillCycleInstance,
  BudgetingPreferences,
  Envelope,
  ImportSuggestion,
  NotificationSettings,
  Paycheck,
  Profile,
  Purchase,
  SyncQueueEntry,
} from "./types";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  essential_reserve: number;
  currency_code: string;
  onboarding_complete: number;
  opening_balance_cents: number;
  opening_balance_as_of_date: string | null;
  tutorial_complete: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: Profile["syncStatus"];
};

export type SyncQueueRow = {
  id: string;
  profile_id: string;
  entity_type: SyncQueueEntry["entityType"];
  entity_id: string;
  operation: SyncQueueEntry["operation"];
  payload_json: string;
  status: SyncQueueEntry["status"];
  attempt_count: number;
  last_attempt_at: string | null;
  error_message: string | null;
  created_at: string;
};

export type PaycheckRow = {
  id: string;
  profile_id: string;
  label: string | null;
  amount_cents: number;
  expected_date: string;
  is_received: number;
  received_at: string | null;
  is_recurring: number;
  recurrence_interval: Paycheck["recurrenceInterval"];
  is_primary: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: Paycheck["syncStatus"];
};

export type BillRow = {
  id: string;
  profile_id: string;
  name: string;
  bill_type: Bill["billType"];
  default_amount_cents: number;
  recurrence_interval: Bill["recurrenceInterval"];
  custom_interval_days: number | null;
  due_day_of_cycle: number | null;
  due_date_absolute: string | null;
  end_date: string | null;
  is_paused: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: Bill["syncStatus"];
};

export type BillCycleInstanceRow = {
  id: string;
  bill_id: string;
  paycheck_cycle_id: string;
  cycle_amount_cents: number;
  is_variable_confirmed: number;
  is_paid: number;
  paid_at: string | null;
  due_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: BillCycleInstance["syncStatus"];
};

export type PurchaseRow = {
  id: string;
  profile_id: string;
  amount_cents: number;
  state: Purchase["state"];
  description: string | null;
  purchase_date: string;
  paycheck_cycle_id: string | null;
  envelope_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: Purchase["syncStatus"];
};

export type BalanceAdjustmentRow = {
  id: string;
  profile_id: string;
  previous_balance_cents: number;
  adjusted_balance_cents: number;
  delta_cents: number;
  reason: string | null;
  created_at: string;
  deleted_at: string | null;
  sync_status: BalanceAdjustment["syncStatus"];
};

export type NotificationSettingsRow = {
  id: string;
  profile_id: string;
  notifications_enabled: number;
  pending_purchase_reminder: number;
  pending_reminder_days: number;
  low_balance_alert: number;
  upcoming_bill_reminder: number;
  bill_reminder_days_before: number;
  created_at: string;
  updated_at: string;
  sync_status: NotificationSettings["syncStatus"];
};

export type BudgetingPreferencesRow = {
  id: string;
  profile_id: string;
  envelopes_enabled: number;
  created_at: string;
  updated_at: string;
  sync_status: BudgetingPreferences["syncStatus"];
};

export type EnvelopeRow = {
  id: string;
  profile_id: string;
  name: string;
  allocation_cents: number;
  sort_order: number;
  is_paused: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: Envelope["syncStatus"];
};

export type ImportSuggestionRow = {
  id: string;
  profile_id: string;
  suggested_name: string;
  suggested_amount_cents: number;
  suggestion_kind: ImportSuggestion["suggestionKind"];
  suggested_date: string | null;
  detected_interval: ImportSuggestion["detectedInterval"];
  occurrence_count: number;
  import_session_id: string;
  status: ImportSuggestion["status"];
  confirmed_bill_id: string | null;
  created_at: string;
  resolved_at: string | null;
  deleted_at: string | null;
};

export type BackupMetadataRow = {
  id: string;
  profile_id: string;
  event_type: BackupMetadata["eventType"];
  file_name: string | null;
  record_count: number | null;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  profile_id: string;
  event_type: ActivityLogEntry["eventType"];
  entity_type: ActivityLogEntry["entityType"];
  entity_id: string | null;
  summary: string | null;
  created_at: string;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    essentialReserveCents: row.essential_reserve,
    currencyCode: row.currency_code,
    onboardingComplete: row.onboarding_complete === 1,
    openingBalanceCents: row.opening_balance_cents,
    openingBalanceAsOfDate: row.opening_balance_as_of_date,
    tutorialComplete: row.tutorial_complete === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status,
  };
}

export function mapSyncQueueRow(row: SyncQueueRow): SyncQueueEntry {
  return {
    id: row.id,
    profileId: row.profile_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payloadJson: row.payload_json,
    status: row.status,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export function mapPaycheckRow(row: PaycheckRow): Paycheck {
  return {
    id: row.id,
    profileId: row.profile_id,
    label: row.label,
    amountCents: row.amount_cents,
    expectedDate: row.expected_date,
    isReceived: row.is_received === 1,
    receivedAt: row.received_at,
    isRecurring: row.is_recurring === 1,
    recurrenceInterval: row.recurrence_interval,
    isPrimary: row.is_primary === 1,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status,
  };
}

export function mapBillRow(row: BillRow): Bill {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    billType: row.bill_type,
    defaultAmountCents: row.default_amount_cents,
    recurrenceInterval: row.recurrence_interval,
    customIntervalDays: row.custom_interval_days,
    dueDayOfCycle: row.due_day_of_cycle,
    dueDateAbsolute: row.due_date_absolute,
    endDate: row.end_date,
    isPaused: row.is_paused === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status,
  };
}

export function mapBillCycleInstanceRow(
  row: BillCycleInstanceRow
): BillCycleInstance {
  return {
    id: row.id,
    billId: row.bill_id,
    paycheckCycleId: row.paycheck_cycle_id,
    cycleAmountCents: row.cycle_amount_cents,
    isVariableConfirmed: row.is_variable_confirmed === 1,
    isPaid: row.is_paid === 1,
    paidAt: row.paid_at,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status,
  };
}

export function mapPurchaseRow(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    profileId: row.profile_id,
    amountCents: row.amount_cents,
    state: row.state,
    description: row.description,
    purchaseDate: row.purchase_date,
    paycheckCycleId: row.paycheck_cycle_id,
    envelopeId: row.envelope_id,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status,
  };
}

export function mapBalanceAdjustmentRow(
  row: BalanceAdjustmentRow
): BalanceAdjustment {
  return {
    id: row.id,
    profileId: row.profile_id,
    previousBalanceCents: row.previous_balance_cents,
    adjustedBalanceCents: row.adjusted_balance_cents,
    deltaCents: row.delta_cents,
    reason: row.reason,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status,
  };
}

export function mapNotificationSettingsRow(
  row: NotificationSettingsRow
): NotificationSettings {
  return {
    id: row.id,
    profileId: row.profile_id,
    notificationsEnabled: row.notifications_enabled === 1,
    pendingPurchaseReminder: row.pending_purchase_reminder === 1,
    pendingReminderDays: row.pending_reminder_days,
    lowBalanceAlert: row.low_balance_alert === 1,
    upcomingBillReminder: row.upcoming_bill_reminder === 1,
    billReminderDaysBefore: row.bill_reminder_days_before,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export function mapBudgetingPreferencesRow(
  row: BudgetingPreferencesRow
): BudgetingPreferences {
  return {
    id: row.id,
    profileId: row.profile_id,
    envelopesEnabled: row.envelopes_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export function mapEnvelopeRow(row: EnvelopeRow): Envelope {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    allocationCents: row.allocation_cents,
    sortOrder: row.sort_order,
    isPaused: row.is_paused === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status,
  };
}

export function mapImportSuggestionRow(
  row: ImportSuggestionRow
): ImportSuggestion {
  return {
    id: row.id,
    profileId: row.profile_id,
    suggestedName: row.suggested_name,
    suggestedAmountCents: row.suggested_amount_cents,
    suggestionKind: row.suggestion_kind,
    suggestedDate: row.suggested_date,
    detectedInterval: row.detected_interval,
    occurrenceCount: row.occurrence_count,
    importSessionId: row.import_session_id,
    status: row.status,
    confirmedBillId: row.confirmed_bill_id,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    deletedAt: row.deleted_at,
  };
}

export function mapBackupMetadataRow(row: BackupMetadataRow): BackupMetadata {
  return {
    id: row.id,
    profileId: row.profile_id,
    eventType: row.event_type,
    fileName: row.file_name,
    recordCount: row.record_count,
    createdAt: row.created_at,
  };
}

export function mapActivityLogRow(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    profileId: row.profile_id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    createdAt: row.created_at,
  };
}
