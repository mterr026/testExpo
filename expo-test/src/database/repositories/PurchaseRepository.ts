import { mapPurchaseRow, type PurchaseRow } from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  Clock,
  IdFactory,
  NewPurchase,
  Purchase,
  PurchaseChanges,
  TransactionalDatabaseExecutor,
} from "./types";

export class PurchaseRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<Purchase | null> {
    const row = await this.db.getFirstAsync<PurchaseRow>(
      `${purchaseSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapPurchaseRow(row) : null;
  }

  async findAll(profileId: string): Promise<Purchase[]> {
    const rows = await this.db.getAllAsync<PurchaseRow>(
      `${purchaseSelectSql()}
      WHERE profile_id = ? AND deleted_at IS NULL
      ORDER BY purchase_date DESC, created_at DESC`,
      [profileId]
    );

    return rows.map(mapPurchaseRow);
  }

  async findByCycle(paycheckCycleId: string): Promise<Purchase[]> {
    const rows = await this.db.getAllAsync<PurchaseRow>(
      `${purchaseSelectSql()}
      WHERE paycheck_cycle_id = ? AND deleted_at IS NULL
      ORDER BY purchase_date DESC, created_at DESC`,
      [paycheckCycleId]
    );

    return rows.map(mapPurchaseRow);
  }

  async findPending(profileId: string): Promise<Purchase[]> {
    const rows = await this.db.getAllAsync<PurchaseRow>(
      `${purchaseSelectSql()}
      WHERE profile_id = ?
        AND state = 'pending'
        AND deleted_at IS NULL
      ORDER BY purchase_date ASC, created_at ASC`,
      [profileId]
    );

    return rows.map(mapPurchaseRow);
  }

  async create(input: NewPurchase): Promise<Purchase> {
    validatePurchaseInput(input);

    const createdAt = this.now().toISOString();
    const purchase: Purchase = {
      id: this.idFactory(),
      profileId: input.profileId,
      amountCents: input.amountCents,
      state: input.state ?? "charged",
      description: normalizeDescription(input.description),
      purchaseDate: input.purchaseDate,
      paycheckCycleId: input.paycheckCycleId ?? null,
      envelopeId: input.envelopeId ?? null,
      resolvedAt: input.resolvedAt ?? null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      syncStatus: "local",
    };

    validatePurchaseInput(purchase);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
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
        purchaseToParams(purchase)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: purchase.profileId,
        entityType: "purchase",
        entityId: purchase.id,
        operation: "create",
        payload: purchase,
      });
    });

    return purchase;
  }

  async update(id: string, changes: PurchaseChanges): Promise<Purchase> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Purchase ${id} not found.`);
    }

    const updated: Purchase = {
      ...current,
      ...changes,
      description:
        "description" in changes
          ? normalizeDescription(changes.description)
          : current.description,
      updatedAt: this.now().toISOString(),
    };

    validatePurchaseInput(updated);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE purchases
        SET amount_cents = ?,
          state = ?,
          description = ?,
          purchase_date = ?,
          paycheck_cycle_id = ?,
          envelope_id = ?,
          resolved_at = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [
          updated.amountCents,
          updated.state,
          updated.description,
          updated.purchaseDate,
          updated.paycheckCycleId,
          updated.envelopeId,
          updated.resolvedAt,
          updated.updatedAt,
          updated.id,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: updated.profileId,
        entityType: "purchase",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }

  async markCharged(id: string): Promise<Purchase> {
    return this.update(id, {
      state: "charged",
      resolvedAt: this.now().toISOString(),
    });
  }

  async markPending(id: string): Promise<Purchase> {
    return this.update(id, {
      state: "pending",
      resolvedAt: null,
    });
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Purchase ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE purchases
        SET deleted_at = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, id]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: current.profileId,
        entityType: "purchase",
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

function purchaseSelectSql() {
  return `SELECT
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
    FROM purchases`;
}

function purchaseToParams(purchase: Purchase) {
  return [
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
  ];
}

type PurchaseInputShape = Pick<
  Purchase,
  "profileId" | "amountCents" | "purchaseDate"
> &
  Partial<Pick<Purchase, "state">>;

function validatePurchaseInput(input: PurchaseInputShape) {
  if (!input.profileId.trim()) {
    throw new Error("Purchase requires a profileId.");
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Purchase amountCents must be greater than zero.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate)) {
    throw new Error("Purchase purchaseDate must be an ISO date.");
  }

  if (input.state && input.state !== "charged" && input.state !== "pending") {
    throw new Error("Purchase state must be charged or pending.");
  }
}

function normalizeDescription(description: string | null | undefined) {
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No purchase idFactory was provided.");
}
