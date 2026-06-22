import { createActivityLogEntry } from "@/engine/activityLog";

import { mapActivityLogRow, type ActivityLogRow } from "./rowMappers";
import type {
  ActivityLogEntry,
  Clock,
  IdFactory,
  NewActivityLogEntry,
  TransactionalDatabaseExecutor,
} from "./types";

export class ActivityLogRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findByProfileId(
    profileId: string,
    limit = 100
  ): Promise<ActivityLogEntry[]> {
    validateFindInput(profileId, limit);

    const rows = await this.db.getAllAsync<ActivityLogRow>(
      `${activityLogSelectSql()}
      WHERE profile_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
      [profileId, limit]
    );

    return rows.map(mapActivityLogRow);
  }

  async create(input: NewActivityLogEntry): Promise<ActivityLogEntry> {
    const entry = createActivityLogEntry({
      ...input,
      entityId: input.entityId ?? null,
      summary: input.summary ?? null,
      idFactory: this.idFactory,
      now: this.now,
    });

    await this.db.runAsync(
      `INSERT INTO activity_log (
        id,
        profile_id,
        event_type,
        entity_type,
        entity_id,
        summary,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.profileId,
        entry.eventType,
        entry.entityType,
        entry.entityId,
        entry.summary,
        entry.createdAt,
      ]
    );

    return entry;
  }
}

function activityLogSelectSql() {
  return `SELECT
    id,
    profile_id,
    event_type,
    entity_type,
    entity_id,
    summary,
    created_at
    FROM activity_log`;
}

function validateFindInput(profileId: string, limit: number) {
  if (!profileId.trim()) {
    throw new Error("Activity log lookup requires a profileId.");
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Activity log lookup limit must be greater than zero.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No activity log idFactory was provided.");
}
