import { describe, expect, it, vi } from "vitest";

import type {
  BalanceAdjustment,
  Bill,
  BillCycleInstance,
  NewBackupMetadata,
  NotificationSettings,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";

import {
  parseBudgetFlowBackupJson,
  validateBudgetFlowBackupPayload,
} from "./BackupContract";
import { BackupService } from "./BackupService";

const profile: Profile = {
  id: "profile-1",
  displayName: "Matt",
  essentialReserveCents: 25000,
  currencyCode: "USD",
  onboardingComplete: true,
  openingBalanceCents: 0,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const paycheck: Paycheck = {
  id: "paycheck-1",
  profileId: "profile-1",
  label: "Primary",
  amountCents: 180000,
  expectedDate: "2026-06-15",
  isReceived: false,
  receivedAt: null,
  isRecurring: true,
  recurrenceInterval: "biweekly",
  isPrimary: true,
  notes: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const bill: Bill = {
  id: "bill-1",
  profileId: "profile-1",
  name: "Rent",
  billType: "fixed",
  defaultAmountCents: 90000,
  recurrenceInterval: "monthly",
  customIntervalDays: null,
  dueDayOfCycle: null,
  dueDateAbsolute: "2026-06-20",
  endDate: null,
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const billCycleInstance: BillCycleInstance = {
  id: "bill-instance-1",
  billId: "bill-1",
  paycheckCycleId: "paycheck-1",
  cycleAmountCents: 90000,
  isVariableConfirmed: false,
  isPaid: false,
  paidAt: null,
  dueDate: "2026-06-20",
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const purchase: Purchase = {
  id: "purchase-1",
  profileId: "profile-1",
  amountCents: 4200,
  state: "pending",
  description: "Gas",
  purchaseDate: "2026-06-10",
  paycheckCycleId: "paycheck-1",
  resolvedAt: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const balanceAdjustment: BalanceAdjustment = {
  id: "adjustment-1",
  profileId: "profile-1",
  previousBalanceCents: 100000,
  adjustedBalanceCents: 125000,
  deltaCents: 25000,
  reason: "Manual balance adjustment",
  createdAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const notificationSettings: NotificationSettings = {
  id: "notification-settings-1",
  profileId: "profile-1",
  notificationsEnabled: true,
  pendingPurchaseReminder: true,
  pendingReminderDays: 7,
  lowBalanceAlert: true,
  upcomingBillReminder: true,
  billReminderDaysBefore: 2,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  syncStatus: "local",
};

function createMocks() {
  return {
    activityLogRepository: {
      create: vi.fn().mockResolvedValue({
        id: "activity-1",
        profileId: "profile-1",
        eventType: "backup_exported",
        entityType: "backup",
        entityId: null,
        summary:
          "Exported backup budget-flow-backup-2026-06-19-120000000Z.json with 6 records.",
        createdAt: "2026-06-19T12:00:00.000Z",
      }),
    },
    balanceAdjustmentRepository: {
      findAll: vi.fn().mockResolvedValue([balanceAdjustment]),
    },
    backupMetadataRepository: {
      create: vi.fn().mockImplementation((input: NewBackupMetadata) =>
        Promise.resolve({
          id: "backup-metadata-1",
          createdAt: "2026-06-19T12:00:00.000Z",
          ...input,
          fileName: input.fileName ?? null,
          recordCount: input.recordCount ?? null,
        })
      ),
    },
    billCycleInstanceRepository: {
      findByCycle: vi.fn().mockResolvedValue([billCycleInstance]),
    },
    billRepository: {
      findAll: vi.fn().mockResolvedValue([bill]),
    },
    notificationSettingsRepository: {
      findByProfileId: vi.fn().mockResolvedValue(notificationSettings),
    },
    paycheckRepository: {
      findAll: vi.fn().mockResolvedValue([paycheck]),
    },
    profileRepository: {
      findActive: vi.fn().mockResolvedValue(profile),
    },
    purchaseRepository: {
      findAll: vi.fn().mockResolvedValue([purchase]),
    },
  };
}

function createService(
  mocks: ReturnType<typeof createMocks>,
  options: ConstructorParameters<typeof BackupService>[7] = {}
) {
  return new BackupService(
    mocks.profileRepository,
    mocks.paycheckRepository,
    mocks.billRepository,
    mocks.billCycleInstanceRepository,
    mocks.purchaseRepository,
    mocks.balanceAdjustmentRepository,
    mocks.notificationSettingsRepository,
    {
      now: () => new Date("2026-06-19T12:00:00.000Z"),
      ...options,
    }
  );
}

describe("BackupService", () => {
  it("buildExportPayload_serializes_financial_core_records_with_count", async () => {
    const mocks = createMocks();
    const service = createService(mocks);

    await expect(service.buildExportPayload()).resolves.toEqual({
      schemaVersion: 1,
      exportedAt: "2026-06-19T12:00:00.000Z",
      profile,
      records: {
        balanceAdjustments: [balanceAdjustment],
        billCycleInstances: [billCycleInstance],
        bills: [bill],
        notificationSettings,
        paychecks: [paycheck],
        purchases: [purchase],
      },
      recordCount: 6,
    });
    expect(mocks.billCycleInstanceRepository.findByCycle).toHaveBeenCalledWith(
      "paycheck-1"
    );
  });

  it("buildExportPayload_excludes_local_operational_tables", async () => {
    const payload = await createService(createMocks()).buildExportPayload();
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain("activity_log");
    expect(serialized).not.toContain("import_suggestions");
    expect(serialized).not.toContain("backup_metadata");
    expect(serialized).not.toContain("sync_queue");
  });

  it("buildExportPackage_returns_filename_json_and_record_count", async () => {
    const exportPackage = await createService(createMocks()).buildExportPackage();

    expect(exportPackage.fileName).toBe(
      "budget-flow-backup-2026-06-19-120000000Z.json"
    );
    expect(exportPackage.recordCount).toBe(6);
    expect(JSON.parse(exportPackage.jsonText)).toEqual(exportPackage.payload);
    expect(exportPackage.jsonText).toContain("\n  \"schemaVersion\": 1");
  });

  it("buildExportPackage_produces_json_that_matches_the_restore_contract", async () => {
    const exportPackage = await createService(createMocks()).buildExportPackage();

    expect(parseBudgetFlowBackupJson(exportPackage.jsonText)).toEqual(
      exportPackage.payload
    );
  });

  it("parseBudgetFlowBackupJson_rejects_invalid_json_before_restore_work_starts", () => {
    expect(() => parseBudgetFlowBackupJson("{nope")).toThrow(
      "Backup file is not valid JSON."
    );
  });

  it("validateBudgetFlowBackupPayload_rejects_unsupported_schema_versions", async () => {
    const exportPackage = await createService(createMocks()).buildExportPackage();

    expect(() =>
      validateBudgetFlowBackupPayload({
        ...exportPackage.payload,
        schemaVersion: 99,
      })
    ).toThrow("Backup schema version is not supported.");
  });

  it("validateBudgetFlowBackupPayload_rejects_record_count_mismatches", async () => {
    const exportPackage = await createService(createMocks()).buildExportPackage();

    expect(() =>
      validateBudgetFlowBackupPayload({
        ...exportPackage.payload,
        recordCount: 999,
      })
    ).toThrow("Backup record count does not match its contents.");
  });

  it("validateBudgetFlowBackupPayload_rejects_cross_profile_records", async () => {
    const exportPackage = await createService(createMocks()).buildExportPackage();

    expect(() =>
      validateBudgetFlowBackupPayload({
        ...exportPackage.payload,
        records: {
          ...exportPackage.payload.records,
          purchases: [
            {
              ...purchase,
              profileId: "other-profile",
            },
          ],
        },
      })
    ).toThrow("Backup contains records for a different profile.");
  });

  it("validateBudgetFlowBackupPayload_rejects_orphaned_bill_instances", async () => {
    const exportPackage = await createService(createMocks()).buildExportPackage();

    expect(() =>
      validateBudgetFlowBackupPayload({
        ...exportPackage.payload,
        records: {
          ...exportPackage.payload.records,
          billCycleInstances: [
            {
              ...billCycleInstance,
              billId: "missing-bill",
            },
          ],
        },
      })
    ).toThrow("Backup contains bill instances with missing references.");
  });

  it("buildExportPayload_rejects_missing_active_profile", async () => {
    const mocks = createMocks();
    mocks.profileRepository.findActive.mockResolvedValue(null);
    const service = createService(mocks);

    await expect(service.buildExportPayload()).rejects.toThrow(
      "Backup export requires an active profile."
    );
    expect(mocks.paycheckRepository.findAll).not.toHaveBeenCalled();
  });

  it("exportToDevice_writes_file_and_records_local_export_metadata", async () => {
    const mocks = createMocks();
    const writeBackupPackage = vi.fn().mockResolvedValue({
      fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
      recordCount: 6,
      uri: "file:///documents/budget-flow-backup-2026-06-19-120000000Z.json",
    });
    const service = createService(mocks, {
      activityLogRepository: mocks.activityLogRepository,
      backupMetadataRepository: mocks.backupMetadataRepository,
      writeBackupPackage,
    });

    await expect(service.exportToDevice()).resolves.toEqual({
      fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
      metadata: {
        id: "backup-metadata-1",
        profileId: "profile-1",
        eventType: "export",
        fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
        recordCount: 6,
        createdAt: "2026-06-19T12:00:00.000Z",
      },
      recordCount: 6,
      uri: "file:///documents/budget-flow-backup-2026-06-19-120000000Z.json",
    });
    expect(writeBackupPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
        recordCount: 6,
      })
    );
    expect(mocks.backupMetadataRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "export",
      fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
      recordCount: 6,
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "backup_exported",
      entityType: "backup",
      summary:
        "Exported backup budget-flow-backup-2026-06-19-120000000Z.json with 6 records.",
    });
  });

  it("exportToDevice_requires_backup_metadata_before_writing_file", async () => {
    const writeBackupPackage = vi.fn();
    const service = createService(createMocks(), { writeBackupPackage });

    await expect(service.exportToDevice()).rejects.toThrow(
      "Backup export requires a backup metadata repository."
    );
    expect(writeBackupPackage).not.toHaveBeenCalled();
  });
});
