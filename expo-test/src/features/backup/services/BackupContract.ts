import type {
  BalanceAdjustment,
  Bill,
  BillCycleInstance,
  BudgetingPreferences,
  Envelope,
  NotificationSettings,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";

import type { BudgetFlowBackupPayload } from "./BackupService";

export const BUDGET_FLOW_BACKUP_SCHEMA_VERSION = 2;
export const SUPPORTED_BUDGET_FLOW_BACKUP_SCHEMA_VERSIONS = [1, 2] as const;

export function parseBudgetFlowBackupJson(
  jsonText: string
): BudgetFlowBackupPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  return validateBudgetFlowBackupPayload(parsed);
}

export function validateBudgetFlowBackupPayload(
  payload: unknown
): BudgetFlowBackupPayload {
  assertRecord(payload, "Backup file is not a valid Budget Flow backup.");

  if (
    !SUPPORTED_BUDGET_FLOW_BACKUP_SCHEMA_VERSIONS.includes(
      payload.schemaVersion as (typeof SUPPORTED_BUDGET_FLOW_BACKUP_SCHEMA_VERSIONS)[number]
    )
  ) {
    throw new Error("Backup schema version is not supported.");
  }

  assertIsoDateTime(payload.exportedAt, "Backup export timestamp is invalid.");
  const profile = validateProfile(payload.profile);
  const records = validateBackupRecords(payload.records, payload.schemaVersion);
  assertRecordsBelongToProfile(profile.id, records);
  assertBillInstancesReferenceBackupRecords(records);
  const sanitizedRecords = sanitizePurchaseEnvelopeReferences(records);

  const recordCount = countBackupRecords(sanitizedRecords);

  if (payload.recordCount !== recordCount) {
    throw new Error("Backup record count does not match its contents.");
  }

  return {
    schemaVersion: payload.schemaVersion as BudgetFlowBackupPayload["schemaVersion"],
    exportedAt: payload.exportedAt,
    profile,
    records: sanitizedRecords,
    recordCount,
  };
}

export function countBackupRecords(
  records: BudgetFlowBackupPayload["records"]
): number {
  return (
    records.balanceAdjustments.length +
    records.billCycleInstances.length +
    records.bills.length +
    records.envelopes.length +
    (records.budgetingPreferences ? 1 : 0) +
    (records.notificationSettings ? 1 : 0) +
    records.paychecks.length +
    records.purchases.length
  );
}

function validateBackupRecords(
  value: unknown,
  schemaVersion: unknown
): BudgetFlowBackupPayload["records"] {
  assertRecord(value, "Backup records are missing.");

  const includeEnvelopeData = schemaVersion === 2;

  return {
    balanceAdjustments: validateArray<BalanceAdjustment>(
      value.balanceAdjustments,
      "Backup balance adjustments are invalid.",
      validateBalanceAdjustment
    ),
    billCycleInstances: validateArray<BillCycleInstance>(
      value.billCycleInstances,
      "Backup bill cycle instances are invalid.",
      validateBillCycleInstance
    ),
    bills: validateArray<Bill>(
      value.bills,
      "Backup bills are invalid.",
      validateBill
    ),
    budgetingPreferences:
      includeEnvelopeData && value.budgetingPreferences != null
        ? validateBudgetingPreferences(value.budgetingPreferences)
        : null,
    envelopes: includeEnvelopeData
      ? validateArray<Envelope>(
          value.envelopes ?? [],
          "Backup envelopes are invalid.",
          validateEnvelope
        )
      : [],
    notificationSettings:
      value.notificationSettings == null
        ? null
        : validateNotificationSettings(value.notificationSettings),
    paychecks: validateArray<Paycheck>(
      value.paychecks,
      "Backup paychecks are invalid.",
      validatePaycheck
    ),
    purchases: validateArray<Purchase>(
      value.purchases,
      "Backup purchases are invalid.",
      validatePurchase
    ),
  };
}

function validateProfile(value: unknown): Profile {
  assertRecord(value, "Backup profile is invalid.");
  assertString(value.id, "Backup profile id is invalid.");
  assertNumber(
    value.essentialReserveCents,
    "Backup profile reserve is invalid."
  );
  assertString(value.currencyCode, "Backup profile currency is invalid.");
  assertBoolean(
    value.onboardingComplete,
    "Backup profile onboarding state is invalid."
  );
  if ("tutorialComplete" in value) {
    assertBoolean(
      value.tutorialComplete,
      "Backup profile tutorial state is invalid."
    );
  }
  assertNumber(
    value.openingBalanceCents,
    "Backup profile opening balance is invalid."
  );
  assertIsoDateTime(value.createdAt, "Backup profile created date is invalid.");
  assertIsoDateTime(value.updatedAt, "Backup profile updated date is invalid.");
  assertNullableString(value.deletedAt, "Backup profile deleted date is invalid.");
  assertSyncStatus(value.syncStatus, "Backup profile sync status is invalid.");

  return value as Profile;
}

function validatePaycheck(value: unknown): Paycheck {
  assertRecord(value, "Backup paycheck is invalid.");
  assertString(value.id, "Backup paycheck id is invalid.");
  assertString(value.profileId, "Backup paycheck profile id is invalid.");
  assertNullableString(value.label, "Backup paycheck label is invalid.");
  assertNumber(value.amountCents, "Backup paycheck amount is invalid.");
  assertIsoDate(value.expectedDate, "Backup paycheck date is invalid.");
  assertBoolean(value.isReceived, "Backup paycheck received state is invalid.");
  assertNullableString(value.receivedAt, "Backup paycheck received date is invalid.");
  assertBoolean(value.isRecurring, "Backup paycheck recurrence state is invalid.");
  assertPaycheckRecurrence(
    value.recurrenceInterval,
    "Backup paycheck recurrence interval is invalid."
  );
  if ("isPrimary" in value) {
    assertBoolean(value.isPrimary, "Backup paycheck primary state is invalid.");
  }
  assertNullableString(value.notes, "Backup paycheck notes are invalid.");
  assertIsoDateTime(value.createdAt, "Backup paycheck created date is invalid.");
  assertIsoDateTime(value.updatedAt, "Backup paycheck updated date is invalid.");
  assertNullableString(value.deletedAt, "Backup paycheck deleted date is invalid.");
  assertSyncStatus(value.syncStatus, "Backup paycheck sync status is invalid.");

  return {
    ...(value as Paycheck),
    isPrimary:
      "isPrimary" in value && typeof value.isPrimary === "boolean"
        ? value.isPrimary
        : true,
  };
}

function validateBill(value: unknown): Bill {
  assertRecord(value, "Backup bill is invalid.");
  assertString(value.id, "Backup bill id is invalid.");
  assertString(value.profileId, "Backup bill profile id is invalid.");
  assertString(value.name, "Backup bill name is invalid.");
  assertOneOf(value.billType, ["fixed", "variable"], "Backup bill type is invalid.");
  assertNumber(value.defaultAmountCents, "Backup bill amount is invalid.");
  assertOneOf(
    value.recurrenceInterval,
    ["weekly", "biweekly", "monthly", "quarterly", "custom"],
    "Backup bill recurrence interval is invalid."
  );
  assertNullableNumber(value.customIntervalDays, "Backup bill custom interval is invalid.");
  assertNullableNumber(value.dueDayOfCycle, "Backup bill due day is invalid.");
  assertNullableString(value.dueDateAbsolute, "Backup bill due date is invalid.");
  assertNullableString(value.endDate, "Backup bill end date is invalid.");
  assertBoolean(value.isPaused, "Backup bill paused state is invalid.");
  assertIsoDateTime(value.createdAt, "Backup bill created date is invalid.");
  assertIsoDateTime(value.updatedAt, "Backup bill updated date is invalid.");
  assertNullableString(value.deletedAt, "Backup bill deleted date is invalid.");
  assertSyncStatus(value.syncStatus, "Backup bill sync status is invalid.");

  return value as Bill;
}

function validateBillCycleInstance(value: unknown): BillCycleInstance {
  assertRecord(value, "Backup bill cycle instance is invalid.");
  assertString(value.id, "Backup bill cycle instance id is invalid.");
  assertString(value.billId, "Backup bill cycle instance bill id is invalid.");
  assertString(
    value.paycheckCycleId,
    "Backup bill cycle instance paycheck cycle id is invalid."
  );
  assertNumber(
    value.cycleAmountCents,
    "Backup bill cycle instance amount is invalid."
  );
  assertBoolean(
    value.isVariableConfirmed,
    "Backup bill cycle instance variable state is invalid."
  );
  assertBoolean(value.isPaid, "Backup bill cycle instance paid state is invalid.");
  assertNullableString(value.paidAt, "Backup bill cycle instance paid date is invalid.");
  assertIsoDate(value.dueDate, "Backup bill cycle instance due date is invalid.");
  assertIsoDateTime(
    value.createdAt,
    "Backup bill cycle instance created date is invalid."
  );
  assertIsoDateTime(
    value.updatedAt,
    "Backup bill cycle instance updated date is invalid."
  );
  assertNullableString(
    value.deletedAt,
    "Backup bill cycle instance deleted date is invalid."
  );
  assertSyncStatus(
    value.syncStatus,
    "Backup bill cycle instance sync status is invalid."
  );

  return value as BillCycleInstance;
}

function validatePurchase(value: unknown): Purchase {
  assertRecord(value, "Backup purchase is invalid.");
  assertString(value.id, "Backup purchase id is invalid.");
  assertString(value.profileId, "Backup purchase profile id is invalid.");
  assertNumber(value.amountCents, "Backup purchase amount is invalid.");
  assertOneOf(value.state, ["charged", "pending"], "Backup purchase state is invalid.");
  assertNullableString(value.description, "Backup purchase description is invalid.");
  assertIsoDate(value.purchaseDate, "Backup purchase date is invalid.");
  assertNullableString(value.paycheckCycleId, "Backup purchase paycheck cycle is invalid.");
  assertNullableString(value.envelopeId, "Backup purchase envelope is invalid.");
  assertNullableString(value.resolvedAt, "Backup purchase resolved date is invalid.");
  assertIsoDateTime(value.createdAt, "Backup purchase created date is invalid.");
  assertIsoDateTime(value.updatedAt, "Backup purchase updated date is invalid.");
  assertNullableString(value.deletedAt, "Backup purchase deleted date is invalid.");
  assertSyncStatus(value.syncStatus, "Backup purchase sync status is invalid.");

  return {
    ...(value as Purchase),
    envelopeId:
      "envelopeId" in value && (value.envelopeId === null || typeof value.envelopeId === "string")
        ? value.envelopeId
        : null,
  };
}

function validateBalanceAdjustment(value: unknown): BalanceAdjustment {
  assertRecord(value, "Backup balance adjustment is invalid.");
  assertString(value.id, "Backup balance adjustment id is invalid.");
  assertString(value.profileId, "Backup balance adjustment profile id is invalid.");
  assertNumber(
    value.previousBalanceCents,
    "Backup balance adjustment previous balance is invalid."
  );
  assertNumber(
    value.adjustedBalanceCents,
    "Backup balance adjustment adjusted balance is invalid."
  );
  assertNumber(value.deltaCents, "Backup balance adjustment delta is invalid.");
  assertNullableString(
    value.reason ?? null,
    "Backup balance adjustment reason is invalid."
  );
  assertIsoDateTime(
    value.createdAt,
    "Backup balance adjustment created date is invalid."
  );
  assertNullableString(
    value.deletedAt,
    "Backup balance adjustment deleted date is invalid."
  );
  assertSyncStatus(
    value.syncStatus,
    "Backup balance adjustment sync status is invalid."
  );

  return {
    ...(value as BalanceAdjustment),
    reason:
      typeof value.reason === "string" && value.reason.length > 0
        ? value.reason
        : null,
  };
}

function validateNotificationSettings(value: unknown): NotificationSettings {
  assertRecord(value, "Backup notification settings are invalid.");
  assertString(value.id, "Backup notification settings id is invalid.");
  assertString(
    value.profileId,
    "Backup notification settings profile id is invalid."
  );
  assertBoolean(
    value.notificationsEnabled,
    "Backup notification enabled state is invalid."
  );
  assertBoolean(
    value.pendingPurchaseReminder,
    "Backup pending reminder state is invalid."
  );
  assertNumber(value.pendingReminderDays, "Backup pending reminder days are invalid.");
  assertBoolean(value.lowBalanceAlert, "Backup low balance alert state is invalid.");
  assertBoolean(
    value.upcomingBillReminder,
    "Backup upcoming bill reminder state is invalid."
  );
  assertNumber(value.billReminderDaysBefore, "Backup bill reminder days are invalid.");
  assertIsoDateTime(
    value.createdAt,
    "Backup notification settings created date is invalid."
  );
  assertIsoDateTime(
    value.updatedAt,
    "Backup notification settings updated date is invalid."
  );
  assertSyncStatus(
    value.syncStatus,
    "Backup notification settings sync status is invalid."
  );

  return value as NotificationSettings;
}

function validateEnvelope(value: unknown): Envelope {
  assertRecord(value, "Backup envelope is invalid.");
  assertString(value.id, "Backup envelope id is invalid.");
  assertString(value.profileId, "Backup envelope profile id is invalid.");
  assertString(value.name, "Backup envelope name is invalid.");
  assertNumber(value.allocationCents, "Backup envelope allocation is invalid.");
  assertNumber(value.sortOrder, "Backup envelope sort order is invalid.");
  assertBoolean(value.isPaused, "Backup envelope paused state is invalid.");
  assertIsoDateTime(value.createdAt, "Backup envelope created date is invalid.");
  assertIsoDateTime(value.updatedAt, "Backup envelope updated date is invalid.");
  assertNullableString(value.deletedAt, "Backup envelope deleted date is invalid.");
  assertSyncStatus(value.syncStatus, "Backup envelope sync status is invalid.");

  return value as Envelope;
}

function validateBudgetingPreferences(value: unknown): BudgetingPreferences {
  assertRecord(value, "Backup budgeting preferences are invalid.");
  assertString(value.id, "Backup budgeting preferences id is invalid.");
  assertString(
    value.profileId,
    "Backup budgeting preferences profile id is invalid."
  );
  assertBoolean(
    value.envelopesEnabled,
    "Backup budgeting preferences envelope state is invalid."
  );
  assertIsoDateTime(
    value.createdAt,
    "Backup budgeting preferences created date is invalid."
  );
  assertIsoDateTime(
    value.updatedAt,
    "Backup budgeting preferences updated date is invalid."
  );
  assertSyncStatus(
    value.syncStatus,
    "Backup budgeting preferences sync status is invalid."
  );

  return value as BudgetingPreferences;
}

function assertRecordsBelongToProfile(
  profileId: string,
  records: BudgetFlowBackupPayload["records"]
) {
  const profileOwnedRecords = [
    ...records.balanceAdjustments,
    ...records.bills,
    ...records.paychecks,
    ...records.purchases,
    ...records.envelopes,
    ...(records.notificationSettings ? [records.notificationSettings] : []),
    ...(records.budgetingPreferences ? [records.budgetingPreferences] : []),
  ];

  if (profileOwnedRecords.some((record) => record.profileId !== profileId)) {
    throw new Error("Backup contains records for a different profile.");
  }
}

function assertBillInstancesReferenceBackupRecords(
  records: BudgetFlowBackupPayload["records"]
) {
  const billIds = new Set(records.bills.map((bill) => bill.id));
  const paycheckIds = new Set(records.paychecks.map((paycheck) => paycheck.id));

  if (
    records.billCycleInstances.some(
      (instance) =>
        !billIds.has(instance.billId) ||
        !paycheckIds.has(instance.paycheckCycleId)
    )
  ) {
    throw new Error("Backup contains bill instances with missing references.");
  }
}

export function sanitizePurchaseEnvelopeReferences(
  records: BudgetFlowBackupPayload["records"]
): BudgetFlowBackupPayload["records"] {
  const envelopeIds = new Set(records.envelopes.map((envelope) => envelope.id));
  let hasOrphanEnvelopeReference = false;

  const purchases = records.purchases.map((purchase) => {
    if (purchase.envelopeId != null && !envelopeIds.has(purchase.envelopeId)) {
      hasOrphanEnvelopeReference = true;
      return {
        ...purchase,
        envelopeId: null,
      };
    }

    return purchase;
  });

  if (!hasOrphanEnvelopeReference) {
    return records;
  }

  return {
    ...records,
    purchases,
  };
}

function validateArray<T>(
  value: unknown,
  message: string,
  validate: (item: unknown) => T
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }

  return value.map(validate);
}

function assertRecord(
  value: unknown,
  message: string
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
}

function assertString(value: unknown, message: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(message);
  }
}

function assertNullableString(value: unknown, message: string) {
  if (value !== null && typeof value !== "string") {
    throw new Error(message);
  }
}

function assertNumber(value: unknown, message: string): asserts value is number {
  if (!Number.isInteger(value)) {
    throw new Error(message);
  }
}

function assertNullableNumber(value: unknown, message: string) {
  if (value !== null && !Number.isInteger(value)) {
    throw new Error(message);
  }
}

function assertBoolean(
  value: unknown,
  message: string
): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new Error(message);
  }
}

function assertIsoDate(
  value: unknown,
  message: string
): asserts value is string {
  assertString(value, message);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(message);
  }
}

function assertIsoDateTime(
  value: unknown,
  message: string
): asserts value is string {
  assertString(value, message);

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(message);
  }
}

function assertSyncStatus(value: unknown, message: string) {
  assertOneOf(value, ["local", "pending", "synced"], message);
}

function assertPaycheckRecurrence(value: unknown, message: string) {
  if (value === null) {
    return;
  }

  assertOneOf(value, ["weekly", "biweekly", "semimonthly", "monthly"], message);
}

function assertOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  message: string
): asserts value is T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new Error(message);
  }
}
