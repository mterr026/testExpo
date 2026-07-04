import { mapEnvelopeRow, type EnvelopeRow } from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  Clock,
  Envelope,
  EnvelopeChanges,
  IdFactory,
  NewEnvelope,
  TransactionalDatabaseExecutor,
} from "./types";

export class EnvelopeRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<Envelope | null> {
    const row = await this.db.getFirstAsync<EnvelopeRow>(
      `${envelopeSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapEnvelopeRow(row) : null;
  }

  async findAll(profileId: string): Promise<Envelope[]> {
    const rows = await this.db.getAllAsync<EnvelopeRow>(
      `${envelopeSelectSql()}
      WHERE profile_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC, created_at ASC`,
      [profileId]
    );

    return rows.map(mapEnvelopeRow);
  }

  async create(input: NewEnvelope): Promise<Envelope> {
    validateEnvelopeInput(input);

    const createdAt = this.now().toISOString();
    const envelope: Envelope = {
      id: this.idFactory(),
      profileId: input.profileId,
      name: input.name.trim(),
      allocationCents: input.allocationCents,
      sortOrder: input.sortOrder ?? 0,
      isPaused: input.isPaused ?? false,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      syncStatus: "local",
    };

    validateEnvelopeInput(envelope);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
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
        envelopeToParams(envelope)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: envelope.profileId,
        entityType: "envelope",
        entityId: envelope.id,
        operation: "create",
        payload: envelope,
      });
    });

    return envelope;
  }

  async update(id: string, changes: EnvelopeChanges): Promise<Envelope> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Envelope ${id} not found.`);
    }

    const updated: Envelope = {
      ...current,
      ...changes,
      name: changes.name?.trim() ?? current.name,
      updatedAt: this.now().toISOString(),
    };

    validateEnvelopeInput(updated);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE envelopes
        SET name = ?,
          allocation_cents = ?,
          sort_order = ?,
          is_paused = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [
          updated.name,
          updated.allocationCents,
          updated.sortOrder,
          updated.isPaused ? 1 : 0,
          updated.updatedAt,
          updated.id,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: updated.profileId,
        entityType: "envelope",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Envelope ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE envelopes
        SET deleted_at = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, id]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: current.profileId,
        entityType: "envelope",
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

function envelopeSelectSql() {
  return `SELECT
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
    FROM envelopes`;
}

function envelopeToParams(envelope: Envelope) {
  return [
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
  ];
}

type EnvelopeInputShape = Pick<Envelope, "profileId" | "name" | "allocationCents"> &
  Partial<Pick<Envelope, "sortOrder">>;

function validateEnvelopeInput(input: EnvelopeInputShape) {
  if (!input.profileId.trim()) {
    throw new Error("Envelope requires a profileId.");
  }

  if (!input.name.trim()) {
    throw new Error("Envelope requires a name.");
  }

  if (!Number.isInteger(input.allocationCents) || input.allocationCents < 0) {
    throw new Error("Envelope allocationCents must be zero or greater.");
  }

  if (
    input.sortOrder != null &&
    (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)
  ) {
    throw new Error("Envelope sortOrder must be zero or greater.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No envelope idFactory was provided.");
}
