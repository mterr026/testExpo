import {
  mapBalanceAdjustmentRow,
  type BalanceAdjustmentRow,
} from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  BalanceAdjustment,
  Clock,
  IdFactory,
  NewBalanceAdjustment,
  TransactionalDatabaseExecutor,
} from "./types";

export class BalanceAdjustmentRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<BalanceAdjustment | null> {
    const row = await this.db.getFirstAsync<BalanceAdjustmentRow>(
      `${adjustmentSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapBalanceAdjustmentRow(row) : null;
  }

  async findAll(profileId: string): Promise<BalanceAdjustment[]> {
    const rows = await this.db.getAllAsync<BalanceAdjustmentRow>(
      `${adjustmentSelectSql()}
      WHERE profile_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
      [profileId]
    );

    return rows.map(mapBalanceAdjustmentRow);
  }

  async create(input: NewBalanceAdjustment): Promise<BalanceAdjustment> {
    validateAdjustmentInput(input);

    const createdAt = this.now().toISOString();
    const adjustment: BalanceAdjustment = {
      id: this.idFactory(),
      profileId: input.profileId,
      previousBalanceCents: input.previousBalanceCents,
      adjustedBalanceCents: input.adjustedBalanceCents,
      deltaCents: input.adjustedBalanceCents - input.previousBalanceCents,
      reason: normalizeReason(input.reason),
      createdAt,
      deletedAt: null,
      syncStatus: "local",
    };

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
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
        adjustmentToParams(adjustment)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: adjustment.profileId,
        entityType: "balance_adjustment",
        entityId: adjustment.id,
        operation: "create",
        payload: adjustment,
      });
    });

    return adjustment;
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Balance adjustment ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE balance_adjustments
        SET deleted_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, id]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: current.profileId,
        entityType: "balance_adjustment",
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

function adjustmentSelectSql() {
  return `SELECT
    id,
    profile_id,
    previous_balance_cents,
    adjusted_balance_cents,
    delta_cents,
    reason,
    created_at,
    deleted_at,
    sync_status
    FROM balance_adjustments`;
}

function adjustmentToParams(adjustment: BalanceAdjustment) {
  return [
    adjustment.id,
    adjustment.profileId,
    adjustment.previousBalanceCents,
    adjustment.adjustedBalanceCents,
    adjustment.deltaCents,
    adjustment.reason,
    adjustment.createdAt,
    adjustment.deletedAt,
    adjustment.syncStatus,
  ];
}

function validateAdjustmentInput(input: NewBalanceAdjustment) {
  if (!input.profileId.trim()) {
    throw new Error("Balance adjustment requires a profileId.");
  }

  if (!Number.isInteger(input.previousBalanceCents)) {
    throw new Error("Balance adjustment previousBalanceCents must be an integer.");
  }

  if (!Number.isInteger(input.adjustedBalanceCents)) {
    throw new Error("Balance adjustment adjustedBalanceCents must be an integer.");
  }
}

function normalizeReason(reason: string | null | undefined) {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : null;
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No balance adjustment idFactory was provided.");
}
