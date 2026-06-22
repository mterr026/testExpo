import { mapBillRow, type BillRow } from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  Bill,
  BillChanges,
  Clock,
  IdFactory,
  NewBill,
  TransactionalDatabaseExecutor,
} from "./types";

export class BillRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<Bill | null> {
    const row = await this.db.getFirstAsync<BillRow>(
      `${billSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapBillRow(row) : null;
  }

  async findAll(profileId: string): Promise<Bill[]> {
    const rows = await this.db.getAllAsync<BillRow>(
      `${billSelectSql()}
      WHERE profile_id = ? AND deleted_at IS NULL
      ORDER BY name ASC, created_at ASC`,
      [profileId]
    );

    return rows.map(mapBillRow);
  }

  async findActiveForCycle(profileId: string, cycleStartDate: string): Promise<Bill[]> {
    const rows = await this.db.getAllAsync<BillRow>(
      `${billSelectSql()}
      WHERE profile_id = ?
        AND deleted_at IS NULL
        AND is_paused = 0
        AND (end_date IS NULL OR end_date > ?)
      ORDER BY name ASC, created_at ASC`,
      [profileId, cycleStartDate]
    );

    return rows.map(mapBillRow);
  }

  async create(input: NewBill): Promise<Bill> {
    validateBillInput(input);

    const createdAt = this.now().toISOString();
    const bill: Bill = {
      id: this.idFactory(),
      profileId: input.profileId,
      name: input.name.trim(),
      billType: input.billType,
      defaultAmountCents: input.defaultAmountCents,
      recurrenceInterval: input.recurrenceInterval,
      customIntervalDays: input.customIntervalDays ?? null,
      dueDayOfCycle: input.dueDayOfCycle ?? null,
      dueDateAbsolute: input.dueDateAbsolute ?? null,
      endDate: input.endDate ?? null,
      isPaused: input.isPaused ?? false,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      syncStatus: "local",
    };

    validateBillInput(bill);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
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
        billToParams(bill)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: bill.profileId,
        entityType: "bill",
        entityId: bill.id,
        operation: "create",
        payload: bill,
      });
    });

    return bill;
  }

  async update(id: string, changes: BillChanges): Promise<Bill> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Bill ${id} not found.`);
    }

    const updated: Bill = {
      ...current,
      ...changes,
      name: changes.name?.trim() ?? current.name,
      updatedAt: this.now().toISOString(),
    };

    validateBillInput(updated);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE bills
        SET name = ?,
          bill_type = ?,
          default_amount_cents = ?,
          recurrence_interval = ?,
          custom_interval_days = ?,
          due_day_of_cycle = ?,
          due_date_absolute = ?,
          end_date = ?,
          is_paused = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [
          updated.name,
          updated.billType,
          updated.defaultAmountCents,
          updated.recurrenceInterval,
          updated.customIntervalDays,
          updated.dueDayOfCycle,
          updated.dueDateAbsolute,
          updated.endDate,
          updated.isPaused ? 1 : 0,
          updated.updatedAt,
          updated.id,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: updated.profileId,
        entityType: "bill",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }

  async pause(id: string): Promise<Bill> {
    return this.update(id, { isPaused: true });
  }

  async resume(id: string): Promise<Bill> {
    return this.update(id, { isPaused: false });
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Bill ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE bills
        SET deleted_at = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, id]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: current.profileId,
        entityType: "bill",
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

function billSelectSql() {
  return `SELECT
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
    FROM bills`;
}

function billToParams(bill: Bill) {
  return [
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
  ];
}

type BillInputShape = Pick<
  Bill,
  "profileId" | "name" | "defaultAmountCents" | "recurrenceInterval"
> &
  Partial<
    Pick<Bill, "customIntervalDays" | "dueDayOfCycle" | "dueDateAbsolute">
  >;

function validateBillInput(input: BillInputShape) {
  if (!input.profileId.trim()) {
    throw new Error("Bill requires a profileId.");
  }

  if (!input.name.trim()) {
    throw new Error("Bill requires a name.");
  }

  if (!Number.isInteger(input.defaultAmountCents) || input.defaultAmountCents < 0) {
    throw new Error("Bill defaultAmountCents must be zero or greater.");
  }

  if (input.recurrenceInterval === "custom" && !input.customIntervalDays) {
    throw new Error("Custom bills require customIntervalDays.");
  }

  if (input.recurrenceInterval !== "custom" && input.customIntervalDays != null) {
    throw new Error("Only custom bills can define customIntervalDays.");
  }

  const dueFieldCount =
    (input.dueDayOfCycle != null ? 1 : 0) +
    (input.dueDateAbsolute != null ? 1 : 0);

  if (dueFieldCount !== 1) {
    throw new Error("Bill must define exactly one due date field.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No bill idFactory was provided.");
}
