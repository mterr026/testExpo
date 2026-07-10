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
  TransactionExecutor,
  TransactionalDatabaseExecutor,
} from "@/database/repositories/types";

import type { BudgetFlowBackupPayload } from "./BackupService";
import { sanitizePurchaseEnvelopeReferences } from "./BackupContract";

export type BackupRestoreResult = {
  fileName: string | null;
  profileId: string;
  recordCount: number;
};

export async function restoreBackupPayload(
  db: TransactionalDatabaseExecutor,
  payload: BudgetFlowBackupPayload,
  targetProfileId: string,
  sourceFileName: string | null = null
): Promise<BackupRestoreResult> {
  const remapped = remapPayloadToProfileId(payload, targetProfileId);
  const sanitized = {
    ...remapped,
    records: sanitizePurchaseEnvelopeReferences(remapped.records),
  };

  await db.withExclusiveTransactionAsync(async (transaction) => {
    await deleteProfileFinancialData(transaction, targetProfileId);
    await upsertProfile(transaction, sanitized.profile);
    await insertPaychecks(transaction, sanitized.records.paychecks);
    await insertBills(transaction, sanitized.records.bills);
    await insertBillCycleInstances(transaction, sanitized.records.billCycleInstances);
    await insertEnvelopes(transaction, sanitized.records.envelopes);
    await insertPurchases(transaction, sanitized.records.purchases);
    await insertBalanceAdjustments(transaction, sanitized.records.balanceAdjustments);

    if (sanitized.records.notificationSettings) {
      await insertNotificationSettings(
        transaction,
        sanitized.records.notificationSettings
      );
    }

    if (sanitized.records.budgetingPreferences) {
      await insertBudgetingPreferences(
        transaction,
        sanitized.records.budgetingPreferences
      );
    }
  });

  return {
    fileName: sourceFileName,
    profileId: targetProfileId,
    recordCount: sanitized.recordCount,
  };
}

function remapPayloadToProfileId(
  payload: BudgetFlowBackupPayload,
  targetProfileId: string
): BudgetFlowBackupPayload {
  if (payload.profile.id === targetProfileId) {
    return payload;
  }

  const remapProfileId = <T extends { profileId: string }>(record: T) => ({
    ...record,
    profileId: targetProfileId,
  });

  return {
    ...payload,
    profile: {
      ...payload.profile,
      id: targetProfileId,
    },
    records: {
      ...payload.records,
      balanceAdjustments: payload.records.balanceAdjustments.map(remapProfileId),
      bills: payload.records.bills.map(remapProfileId),
      paychecks: payload.records.paychecks.map(remapProfileId),
      purchases: payload.records.purchases.map(remapProfileId),
      envelopes: payload.records.envelopes.map(remapProfileId),
      notificationSettings: payload.records.notificationSettings
        ? remapProfileId(payload.records.notificationSettings)
        : null,
      budgetingPreferences: payload.records.budgetingPreferences
        ? remapProfileId(payload.records.budgetingPreferences)
        : null,
    },
  };
}

export async function clearProfileFinancialData(
  db: TransactionalDatabaseExecutor,
  profileId: string
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await deleteProfileFinancialData(transaction, profileId);
  });
}

async function deleteProfileFinancialData(
  transaction: TransactionExecutor,
  profileId: string
) {
  await transaction.runAsync(
    `DELETE FROM bill_cycle_instances
    WHERE bill_id IN (SELECT id FROM bills WHERE profile_id = ?)
      OR paycheck_cycle_id IN (SELECT id FROM paychecks WHERE profile_id = ?)`,
    [profileId, profileId]
  );
  await transaction.runAsync(`DELETE FROM purchases WHERE profile_id = ?`, [
    profileId,
  ]);
  await transaction.runAsync(
    `DELETE FROM balance_adjustments WHERE profile_id = ?`,
    [profileId]
  );
  await transaction.runAsync(`DELETE FROM bills WHERE profile_id = ?`, [profileId]);
  await transaction.runAsync(`DELETE FROM paychecks WHERE profile_id = ?`, [
    profileId,
  ]);
  await transaction.runAsync(`DELETE FROM envelopes WHERE profile_id = ?`, [
    profileId,
  ]);
  await transaction.runAsync(
    `DELETE FROM notification_settings WHERE profile_id = ?`,
    [profileId]
  );
  await transaction.runAsync(
    `DELETE FROM budgeting_preferences WHERE profile_id = ?`,
    [profileId]
  );
}

async function upsertProfile(transaction: TransactionExecutor, profile: Profile) {
  await transaction.runAsync(
    `UPDATE profiles
    SET display_name = ?,
      essential_reserve = ?,
      currency_code = ?,
      onboarding_complete = ?,
      opening_balance_cents = ?,
      opening_balance_as_of_date = ?,
      tutorial_complete = ?,
      updated_at = ?,
      deleted_at = NULL,
      sync_status = ?
    WHERE id = ?`,
    [
      profile.displayName,
      profile.essentialReserveCents,
      profile.currencyCode,
      profile.onboardingComplete ? 1 : 0,
      profile.openingBalanceCents,
      profile.openingBalanceAsOfDate,
      profile.tutorialComplete ? 1 : 0,
      profile.updatedAt,
      profile.syncStatus,
      profile.id,
    ]
  );
}

async function insertPaychecks(transaction: TransactionExecutor, paychecks: Paycheck[]) {
  for (const paycheck of paychecks) {
    await transaction.runAsync(
      `INSERT INTO paychecks (
        id,
        profile_id,
        label,
        amount_cents,
        expected_date,
        is_received,
        received_at,
        is_recurring,
        recurrence_interval,
        is_primary,
        notes,
        created_at,
        updated_at,
        deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paycheck.id,
        paycheck.profileId,
        paycheck.label,
        paycheck.amountCents,
        paycheck.expectedDate,
        paycheck.isReceived ? 1 : 0,
        paycheck.receivedAt,
        paycheck.isRecurring ? 1 : 0,
        paycheck.recurrenceInterval,
        paycheck.isPrimary ? 1 : 0,
        paycheck.notes,
        paycheck.createdAt,
        paycheck.updatedAt,
        paycheck.deletedAt,
        paycheck.syncStatus,
      ]
    );
  }
}

async function insertBills(transaction: TransactionExecutor, bills: Bill[]) {
  for (const bill of bills) {
    await transaction.runAsync(
      `INSERT INTO bills (
        id,
        profile_id,
        name,
        bill_type,
        default_amount_cents,
        recurrence_interval,
        custom_interval_days,
        due_day_of_cycle,
        due_date_absolute,
        end_date,
        is_paused,
        created_at,
        updated_at,
        deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill.id,
        bill.profileId,
        bill.name,
        bill.billType,
        bill.defaultAmountCents,
        bill.recurrenceInterval,
        bill.customIntervalDays,
        bill.dueDayOfCycle,
        bill.dueDateAbsolute,
        bill.endDate,
        bill.isPaused ? 1 : 0,
        bill.createdAt,
        bill.updatedAt,
        bill.deletedAt,
        bill.syncStatus,
      ]
    );
  }
}

async function insertBillCycleInstances(
  transaction: TransactionExecutor,
  instances: BillCycleInstance[]
) {
  for (const instance of instances) {
    await transaction.runAsync(
      `INSERT INTO bill_cycle_instances (
        id,
        bill_id,
        paycheck_cycle_id,
        cycle_amount_cents,
        is_variable_confirmed,
        is_paid,
        paid_at,
        due_date,
        created_at,
        updated_at,
        deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instance.id,
        instance.billId,
        instance.paycheckCycleId,
        instance.cycleAmountCents,
        instance.isVariableConfirmed ? 1 : 0,
        instance.isPaid ? 1 : 0,
        instance.paidAt,
        instance.dueDate,
        instance.createdAt,
        instance.updatedAt,
        instance.deletedAt,
        instance.syncStatus,
      ]
    );
  }
}

async function insertEnvelopes(transaction: TransactionExecutor, envelopes: Envelope[]) {
  for (const envelope of envelopes) {
    await transaction.runAsync(
      `INSERT INTO envelopes (
        id,
        profile_id,
        name,
        allocation_cents,
        sort_order,
        is_paused,
        created_at,
        updated_at,
        deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        envelope.id,
        envelope.profileId,
        envelope.name,
        envelope.allocationCents,
        envelope.sortOrder,
        envelope.isPaused ? 1 : 0,
        envelope.createdAt,
        envelope.updatedAt,
        envelope.deletedAt,
        envelope.syncStatus,
      ]
    );
  }
}

async function insertPurchases(transaction: TransactionExecutor, purchases: Purchase[]) {
  for (const purchase of purchases) {
    await transaction.runAsync(
      `INSERT INTO purchases (
        id,
        profile_id,
        amount_cents,
        state,
        description,
        purchase_date,
        paycheck_cycle_id,
        envelope_id,
        resolved_at,
        created_at,
        updated_at,
        deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchase.id,
        purchase.profileId,
        purchase.amountCents,
        purchase.state,
        purchase.description,
        purchase.purchaseDate,
        purchase.paycheckCycleId,
        purchase.envelopeId,
        purchase.resolvedAt,
        purchase.createdAt,
        purchase.updatedAt,
        purchase.deletedAt,
        purchase.syncStatus,
      ]
    );
  }
}

async function insertBalanceAdjustments(
  transaction: TransactionExecutor,
  adjustments: BalanceAdjustment[]
) {
  for (const adjustment of adjustments) {
    await transaction.runAsync(
      `INSERT INTO balance_adjustments (
        id,
        profile_id,
        previous_balance_cents,
        adjusted_balance_cents,
        delta_cents,
        reason,
        created_at,
        deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adjustment.id,
        adjustment.profileId,
        adjustment.previousBalanceCents,
        adjustment.adjustedBalanceCents,
        adjustment.deltaCents,
        adjustment.reason,
        adjustment.createdAt,
        adjustment.deletedAt,
        adjustment.syncStatus,
      ]
    );
  }
}

async function insertNotificationSettings(
  transaction: TransactionExecutor,
  settings: NotificationSettings
) {
  await transaction.runAsync(
    `INSERT INTO notification_settings (
      id,
      profile_id,
      notifications_enabled,
      pending_purchase_reminder,
      pending_reminder_days,
      low_balance_alert,
      upcoming_bill_reminder,
      bill_reminder_days_before,
      created_at,
      updated_at,
      sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settings.id,
      settings.profileId,
      settings.notificationsEnabled ? 1 : 0,
      settings.pendingPurchaseReminder ? 1 : 0,
      settings.pendingReminderDays,
      settings.lowBalanceAlert ? 1 : 0,
      settings.upcomingBillReminder ? 1 : 0,
      settings.billReminderDaysBefore,
      settings.createdAt,
      settings.updatedAt,
      settings.syncStatus,
    ]
  );
}

async function insertBudgetingPreferences(
  transaction: TransactionExecutor,
  preferences: BudgetingPreferences
) {
  await transaction.runAsync(
    `INSERT INTO budgeting_preferences (
      id,
      profile_id,
      envelopes_enabled,
      created_at,
      updated_at,
      sync_status
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      preferences.id,
      preferences.profileId,
      preferences.envelopesEnabled ? 1 : 0,
      preferences.createdAt,
      preferences.updatedAt,
      preferences.syncStatus,
    ]
  );
}
