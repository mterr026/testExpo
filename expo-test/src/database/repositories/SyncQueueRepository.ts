import { mapSyncQueueRow, type SyncQueueRow } from "./rowMappers";
import type {
  Clock,
  DatabaseExecutor,
  IdFactory,
  NewSyncQueueEntry,
  SyncQueueEntry,
} from "./types";

export class SyncQueueRepository {
  constructor(
    private readonly db: DatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async enqueue(entry: NewSyncQueueEntry): Promise<SyncQueueEntry> {
    const queueEntry: SyncQueueEntry = {
      id: this.idFactory(),
      profileId: entry.profileId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      operation: entry.operation,
      payloadJson: JSON.stringify(entry.payload),
      status: "pending",
      attemptCount: 0,
      lastAttemptAt: null,
      errorMessage: null,
      createdAt: this.now().toISOString(),
    };

    await this.db.runAsync(
      `INSERT INTO sync_queue (
        id,
        profile_id,
        entity_type,
        entity_id,
        operation,
        payload_json,
        status,
        attempt_count,
        last_attempt_at,
        error_message,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        queueEntry.id,
        queueEntry.profileId,
        queueEntry.entityType,
        queueEntry.entityId,
        queueEntry.operation,
        queueEntry.payloadJson,
        queueEntry.status,
        queueEntry.attemptCount,
        queueEntry.lastAttemptAt,
        queueEntry.errorMessage,
        queueEntry.createdAt,
      ]
    );

    return queueEntry;
  }

  async findPending(profileId: string): Promise<SyncQueueEntry[]> {
    const rows = await this.db.getAllAsync<SyncQueueRow>(
      `SELECT
        id,
        profile_id,
        entity_type,
        entity_id,
        operation,
        payload_json,
        status,
        attempt_count,
        last_attempt_at,
        error_message,
        created_at
      FROM sync_queue
      WHERE profile_id = ? AND status = 'pending'
      ORDER BY created_at ASC`,
      [profileId]
    );

    return rows.map(mapSyncQueueRow);
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No sync queue idFactory was provided.");
}
