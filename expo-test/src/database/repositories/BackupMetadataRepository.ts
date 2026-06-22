import {
  mapBackupMetadataRow,
  type BackupMetadataRow,
} from "./rowMappers";
import type {
  BackupMetadata,
  BackupMetadataEventType,
  Clock,
  IdFactory,
  NewBackupMetadata,
  TransactionalDatabaseExecutor,
} from "./types";

export class BackupMetadataRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findLatestByProfileId(
    profileId: string,
    eventType?: BackupMetadataEventType
  ): Promise<BackupMetadata | null> {
    validateProfileId(profileId);

    const filters = ["profile_id = ?"];
    const params: unknown[] = [profileId];

    if (eventType) {
      filters.push("event_type = ?");
      params.push(eventType);
    }

    const row = await this.db.getFirstAsync<BackupMetadataRow>(
      `${backupMetadataSelectSql()}
      WHERE ${filters.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 1`,
      params
    );

    return row ? mapBackupMetadataRow(row) : null;
  }

  async create(input: NewBackupMetadata): Promise<BackupMetadata> {
    validateMetadataInput(input);

    const metadata: BackupMetadata = {
      id: this.idFactory(),
      profileId: input.profileId,
      eventType: input.eventType,
      fileName: input.fileName?.trim() || null,
      recordCount: input.recordCount ?? null,
      createdAt: this.now().toISOString(),
    };

    await this.db.runAsync(
      `INSERT INTO backup_metadata (
        id,
        profile_id,
        event_type,
        file_name,
        record_count,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        metadata.id,
        metadata.profileId,
        metadata.eventType,
        metadata.fileName,
        metadata.recordCount,
        metadata.createdAt,
      ]
    );

    return metadata;
  }
}

function backupMetadataSelectSql() {
  return `SELECT
    id,
    profile_id,
    event_type,
    file_name,
    record_count,
    created_at
    FROM backup_metadata`;
}

function validateProfileId(profileId: string) {
  if (!profileId.trim()) {
    throw new Error("Backup metadata lookup requires a profileId.");
  }
}

function validateMetadataInput(input: NewBackupMetadata) {
  validateProfileId(input.profileId);

  if (input.eventType !== "export" && input.eventType !== "restore") {
    throw new Error("Backup metadata event type must be export or restore.");
  }

  if (
    input.recordCount != null &&
    (!Number.isInteger(input.recordCount) || input.recordCount < 0)
  ) {
    throw new Error("Backup metadata record count cannot be negative.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No backup metadata idFactory was provided.");
}
