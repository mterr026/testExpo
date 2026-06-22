import { mapPaycheckRow, type PaycheckRow } from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  Clock,
  IdFactory,
  NewPaycheck,
  Paycheck,
  PaycheckChanges,
  TransactionalDatabaseExecutor,
} from "./types";

export class PaycheckRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<Paycheck | null> {
    const row = await this.db.getFirstAsync<PaycheckRow>(
      `${paycheckSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapPaycheckRow(row) : null;
  }

  async findAll(profileId: string): Promise<Paycheck[]> {
    const rows = await this.db.getAllAsync<PaycheckRow>(
      `${paycheckSelectSql()}
      WHERE profile_id = ? AND deleted_at IS NULL
      ORDER BY expected_date ASC, created_at ASC`,
      [profileId]
    );

    return rows.map(mapPaycheckRow);
  }

  async create(input: NewPaycheck): Promise<Paycheck> {
    validatePaycheckInput(input);

    const createdAt = this.now().toISOString();
    const paycheck: Paycheck = {
      id: this.idFactory(),
      profileId: input.profileId,
      label: input.label ?? null,
      amountCents: input.amountCents,
      expectedDate: input.expectedDate,
      isReceived: input.isReceived ?? false,
      receivedAt: input.receivedAt ?? null,
      isRecurring: input.isRecurring ?? false,
      recurrenceInterval: input.recurrenceInterval ?? null,
      isPrimary: input.isPrimary ?? true,
      notes: input.notes ?? null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      syncStatus: "local",
    };

    validateRecurringShape(paycheck);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
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
        paycheckToParams(paycheck)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: paycheck.profileId,
        entityType: "paycheck",
        entityId: paycheck.id,
        operation: "create",
        payload: paycheck,
      });
    });

    return paycheck;
  }

  async update(id: string, changes: PaycheckChanges): Promise<Paycheck> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Paycheck ${id} not found.`);
    }

    const updated: Paycheck = {
      ...current,
      ...changes,
      updatedAt: this.now().toISOString(),
    };

    validatePaycheckInput(updated);
    validateRecurringShape(updated);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE paychecks
        SET label = ?,
          amount_cents = ?,
          expected_date = ?,
          is_received = ?,
          received_at = ?,
          is_recurring = ?,
          recurrence_interval = ?,
          is_primary = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [
          updated.label,
          updated.amountCents,
          updated.expectedDate,
          updated.isReceived ? 1 : 0,
          updated.receivedAt,
          updated.isRecurring ? 1 : 0,
          updated.recurrenceInterval,
          updated.isPrimary ? 1 : 0,
          updated.notes,
          updated.updatedAt,
          updated.id,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: updated.profileId,
        entityType: "paycheck",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }

  async markReceived(id: string): Promise<Paycheck> {
    const receivedAt = this.now().toISOString();

    return this.update(id, {
      isReceived: true,
      receivedAt,
    });
  }

  async markUnreceived(id: string): Promise<Paycheck> {
    return this.update(id, {
      isReceived: false,
      receivedAt: null,
    });
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Paycheck ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE paychecks
        SET deleted_at = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, id]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: current.profileId,
        entityType: "paycheck",
        entityId: id,
        operation: "delete",
        payload: {
          entityId: id,
          deletedAt,
        },
      });
    });
  }
}

function paycheckSelectSql() {
  return `SELECT
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
    FROM paychecks`;
}

function paycheckToParams(paycheck: Paycheck) {
  return [
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
  ];
}

function validatePaycheckInput(input: Pick<Paycheck, "profileId" | "amountCents" | "expectedDate">) {
  if (!input.profileId.trim()) {
    throw new Error("Paycheck requires a profileId.");
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Paycheck amountCents must be greater than zero.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expectedDate)) {
    throw new Error("Paycheck expectedDate must be an ISO date.");
  }
}

function validateRecurringShape(input: Pick<Paycheck, "isRecurring" | "recurrenceInterval">) {
  if (input.isRecurring && !input.recurrenceInterval) {
    throw new Error("Recurring paychecks require a recurrenceInterval.");
  }

  if (!input.isRecurring && input.recurrenceInterval) {
    throw new Error("Non-recurring paychecks cannot define a recurrenceInterval.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No paycheck idFactory was provided.");
}
