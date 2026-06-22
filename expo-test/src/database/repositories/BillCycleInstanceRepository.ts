import {
  mapBillCycleInstanceRow,
  type BillCycleInstanceRow,
} from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  BillCycleInstance,
  BillCycleInstanceChanges,
  Clock,
  IdFactory,
  NewBillCycleInstance,
  TransactionalDatabaseExecutor,
} from "./types";

export class BillCycleInstanceRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<BillCycleInstance | null> {
    const row = await this.db.getFirstAsync<BillCycleInstanceRow>(
      `${instanceSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapBillCycleInstanceRow(row) : null;
  }

  async findByCycle(paycheckCycleId: string): Promise<BillCycleInstance[]> {
    const rows = await this.db.getAllAsync<BillCycleInstanceRow>(
      `${instanceSelectSql()}
      WHERE paycheck_cycle_id = ? AND deleted_at IS NULL
      ORDER BY due_date ASC, created_at ASC`,
      [paycheckCycleId]
    );

    return rows.map(mapBillCycleInstanceRow);
  }

  async findByProfile(profileId: string): Promise<BillCycleInstance[]> {
    const rows = await this.db.getAllAsync<BillCycleInstanceRow>(
      `${instanceSelectSql()}
      WHERE bill_id IN (
          SELECT id FROM bills WHERE profile_id = ? AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
      ORDER BY due_date ASC, created_at ASC`,
      [profileId]
    );

    return rows.map(mapBillCycleInstanceRow);
  }

  async findExisting(
    billId: string,
    paycheckCycleId: string,
    dueDate: string
  ): Promise<BillCycleInstance | null> {
    const row = await this.db.getFirstAsync<BillCycleInstanceRow>(
      `${instanceSelectSql()}
      WHERE bill_id = ?
        AND paycheck_cycle_id = ?
        AND due_date = ?
        AND deleted_at IS NULL`,
      [billId, paycheckCycleId, dueDate]
    );

    return row ? mapBillCycleInstanceRow(row) : null;
  }

  async create(input: NewBillCycleInstance, profileId: string): Promise<BillCycleInstance> {
    validateInstanceInput(input);

    const createdAt = this.now().toISOString();
    const instance: BillCycleInstance = {
      id: this.idFactory(),
      billId: input.billId,
      paycheckCycleId: input.paycheckCycleId,
      cycleAmountCents: input.cycleAmountCents,
      isVariableConfirmed: input.isVariableConfirmed ?? false,
      isPaid: input.isPaid ?? false,
      paidAt: input.paidAt ?? null,
      dueDate: input.dueDate,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      syncStatus: "local",
    };

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
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
        instanceToParams(instance)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId,
        entityType: "bill_cycle_instance",
        entityId: instance.id,
        operation: "create",
        payload: instance,
      });
    });

    return instance;
  }

  async update(
    id: string,
    changes: BillCycleInstanceChanges,
    profileId: string
  ): Promise<BillCycleInstance> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Bill cycle instance ${id} not found.`);
    }

    const updated: BillCycleInstance = {
      ...current,
      ...changes,
      updatedAt: this.now().toISOString(),
    };

    validateInstanceInput(updated);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE bill_cycle_instances
        SET cycle_amount_cents = ?,
          is_variable_confirmed = ?,
          is_paid = ?,
          paid_at = ?,
          due_date = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [
          updated.cycleAmountCents,
          updated.isVariableConfirmed ? 1 : 0,
          updated.isPaid ? 1 : 0,
          updated.paidAt,
          updated.dueDate,
          updated.updatedAt,
          updated.id,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId,
        entityType: "bill_cycle_instance",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }

  async markPaid(id: string, profileId: string): Promise<BillCycleInstance> {
    const paidAt = this.now().toISOString();

    return this.update(id, { isPaid: true, paidAt }, profileId);
  }

  async markUnpaid(id: string, profileId: string): Promise<BillCycleInstance> {
    return this.update(id, { isPaid: false, paidAt: null }, profileId);
  }

  async confirmVariableAmount(
    id: string,
    amountCents: number,
    profileId: string
  ): Promise<BillCycleInstance> {
    return this.update(
      id,
      { cycleAmountCents: amountCents, isVariableConfirmed: true },
      profileId
    );
  }

  async softDelete(id: string, profileId: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Bill cycle instance ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE bill_cycle_instances
        SET deleted_at = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, id]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId,
        entityType: "bill_cycle_instance",
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

function instanceSelectSql() {
  return `SELECT
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
    FROM bill_cycle_instances`;
}

function instanceToParams(instance: BillCycleInstance) {
  return [
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
  ];
}

function validateInstanceInput(input: Pick<BillCycleInstance, "billId" | "paycheckCycleId" | "cycleAmountCents" | "dueDate">) {
  if (!input.billId.trim()) {
    throw new Error("Bill cycle instance requires a billId.");
  }

  if (!input.paycheckCycleId.trim()) {
    throw new Error("Bill cycle instance requires a paycheckCycleId.");
  }

  if (!Number.isInteger(input.cycleAmountCents) || input.cycleAmountCents < 0) {
    throw new Error("Bill cycle instance amount must be zero or greater.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    throw new Error("Bill cycle instance dueDate must be an ISO date.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No bill cycle instance idFactory was provided.");
}
