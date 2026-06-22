import { describe, expect, it } from "vitest";

import { BackupMetadataRepository } from "./BackupMetadataRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const metadataRow = {
  id: "backup-metadata-1",
  profile_id: "profile-1",
  event_type: "export",
  file_name: "budget-flow-backup.json",
  record_count: 12,
  created_at: "2026-06-01T12:00:00.000Z",
} as const;

describe("BackupMetadataRepository", () => {
  it("findLatestByProfileId_maps_latest_backup_metadata", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(metadataRow);
    const repo = new BackupMetadataRepository(db);

    await expect(repo.findLatestByProfileId("profile-1")).resolves.toEqual({
      id: "backup-metadata-1",
      profileId: "profile-1",
      eventType: "export",
      fileName: "budget-flow-backup.json",
      recordCount: 12,
      createdAt: "2026-06-01T12:00:00.000Z",
    });
    expect(db.getFirstCalls[0].source).toContain("FROM backup_metadata");
    expect(db.getFirstCalls[0].source).toContain("ORDER BY created_at DESC");
    expect(db.getFirstCalls[0].source).toContain("LIMIT 1");
    expect(db.getFirstCalls[0].params).toEqual(["profile-1"]);
  });

  it("findLatestByProfileId_can_filter_by_event_type", async () => {
    const db = new FakeDatabase();
    const repo = new BackupMetadataRepository(db);

    await repo.findLatestByProfileId("profile-1", "restore");

    expect(db.getFirstCalls[0].source).toContain("event_type = ?");
    expect(db.getFirstCalls[0].params).toEqual(["profile-1", "restore"]);
  });

  it("create_inserts_local_only_backup_metadata", async () => {
    const db = new FakeDatabase();
    const repo = new BackupMetadataRepository(
      db,
      createIncrementingIdFactory("backup-metadata"),
      fixedClock
    );

    const metadata = await repo.create({
      profileId: "profile-1",
      eventType: "export",
      fileName: " budget-flow-backup.json ",
      recordCount: 12,
    });

    expect(metadata).toEqual({
      id: "backup-metadata-1",
      profileId: "profile-1",
      eventType: "export",
      fileName: "budget-flow-backup.json",
      recordCount: 12,
      createdAt: "2026-06-01T12:00:00.000Z",
    });
    expect(db.runCalls).toHaveLength(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO backup_metadata");
    expect(db.runCalls[0].source).not.toContain("sync_queue");
    expect(db.runCalls[0].params).toEqual([
      "backup-metadata-1",
      "profile-1",
      "export",
      "budget-flow-backup.json",
      12,
      "2026-06-01T12:00:00.000Z",
    ]);
  });

  it("create_allows_restore_events_without_file_details", async () => {
    const db = new FakeDatabase();
    const repo = new BackupMetadataRepository(
      db,
      createIncrementingIdFactory("backup-metadata"),
      fixedClock
    );

    const metadata = await repo.create({
      profileId: "profile-1",
      eventType: "restore",
    });

    expect(metadata.fileName).toBeNull();
    expect(metadata.recordCount).toBeNull();
    expect(db.runCalls[0].params?.[3]).toBeNull();
    expect(db.runCalls[0].params?.[4]).toBeNull();
  });

  it("rejects_invalid_inputs", async () => {
    const repo = new BackupMetadataRepository(new FakeDatabase());

    await expect(repo.findLatestByProfileId("")).rejects.toThrow(
      "Backup metadata lookup requires a profileId."
    );
    await expect(
      repo.create({
        profileId: "",
        eventType: "export",
      })
    ).rejects.toThrow("Backup metadata lookup requires a profileId.");
    await expect(
      repo.create({
        profileId: "profile-1",
        eventType: "export",
        recordCount: -1,
      })
    ).rejects.toThrow("Backup metadata record count cannot be negative.");
  });
});
