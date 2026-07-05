import type {
  ActivityLogEntry,
  BalanceAdjustment,
  BackupMetadata,
  Bill,
  BillCycleInstance,
  BudgetingPreferences,
  Envelope,
  NewActivityLogEntry,
  NewBackupMetadata,
  NotificationSettings,
  Paycheck,
  Profile,
  Purchase,
  TransactionalDatabaseExecutor,
} from "@/database/repositories/types";

import {
  writeBackupPackageToDevice,
  type WrittenBackupFile,
} from "./BackupFileExport";
import { pickAndReadBackupFile } from "./BackupFileImport";
import {
  BUDGET_FLOW_BACKUP_SCHEMA_VERSION,
  countBackupRecords,
  parseBudgetFlowBackupJson,
} from "./BackupContract";
import { createBackupFileName } from "./backupPaths";
import { restoreBackupPayload } from "./BackupRestoreWriter";

type BackupProfileRepository = {
  findActive(): Promise<Profile | null>;
};

type BackupPaycheckRepository = {
  findAll(profileId: string): Promise<Paycheck[]>;
};

type BackupBillRepository = {
  findAll(profileId: string): Promise<Bill[]>;
};

type BackupBillCycleInstanceRepository = {
  findByCycle(paycheckCycleId: string): Promise<BillCycleInstance[]>;
};

type BackupPurchaseRepository = {
  findAll(profileId: string): Promise<Purchase[]>;
};

type BackupBalanceAdjustmentRepository = {
  findAll(profileId: string): Promise<BalanceAdjustment[]>;
};

type BackupNotificationSettingsRepository = {
  findByProfileId(profileId: string): Promise<NotificationSettings | null>;
};

type BackupEnvelopeRepository = {
  findAll(profileId: string): Promise<Envelope[]>;
};

type BackupBudgetingPreferencesRepository = {
  findByProfileId(profileId: string): Promise<BudgetingPreferences | null>;
};

type BackupMetadataRepository = {
  create(input: NewBackupMetadata): Promise<BackupMetadata>;
};

type BackupActivityLogRepository = {
  create(input: NewActivityLogEntry): Promise<ActivityLogEntry>;
};

type BackupPackageWriter = (
  exportPackage: BudgetFlowBackupExportPackage
) => Promise<WrittenBackupFile>;

type BackupFilePicker = () => Promise<{
  fileName: string;
  jsonText: string;
} | null>;

export type BudgetFlowBackupPayload = {
  schemaVersion: typeof BUDGET_FLOW_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  profile: Profile;
  records: {
    balanceAdjustments: BalanceAdjustment[];
    billCycleInstances: BillCycleInstance[];
    bills: Bill[];
    budgetingPreferences: BudgetingPreferences | null;
    envelopes: Envelope[];
    notificationSettings: NotificationSettings | null;
    paychecks: Paycheck[];
    purchases: Purchase[];
  };
  recordCount: number;
};

export type BudgetFlowBackupExportPackage = {
  fileName: string;
  jsonText: string;
  payload: BudgetFlowBackupPayload;
  recordCount: number;
};

export type BudgetFlowBackupExportResult = WrittenBackupFile & {
  metadata: BackupMetadata;
};

export type BudgetFlowBackupRestoreResult = {
  fileName: string | null;
  metadata: BackupMetadata;
  profileId: string;
  recordCount: number;
};

type BackupServiceOptions = {
  activityLogRepository?: BackupActivityLogRepository;
  backupMetadataRepository?: BackupMetadataRepository;
  database?: TransactionalDatabaseExecutor;
  now?: () => Date;
  pickBackupFile?: BackupFilePicker;
  writeBackupPackage?: BackupPackageWriter;
};

export class BackupService {
  constructor(
    private readonly profileRepository: BackupProfileRepository,
    private readonly paycheckRepository: BackupPaycheckRepository,
    private readonly billRepository: BackupBillRepository,
    private readonly billCycleInstanceRepository: BackupBillCycleInstanceRepository,
    private readonly purchaseRepository: BackupPurchaseRepository,
    private readonly balanceAdjustmentRepository: BackupBalanceAdjustmentRepository,
    private readonly notificationSettingsRepository: BackupNotificationSettingsRepository,
    private readonly envelopeRepository: BackupEnvelopeRepository,
    private readonly budgetingPreferencesRepository: BackupBudgetingPreferencesRepository,
    private readonly options: BackupServiceOptions = {}
  ) {}

  async buildExportPayload(): Promise<BudgetFlowBackupPayload> {
    const profile = await this.profileRepository.findActive();

    if (!profile) {
      throw new Error("Backup export requires an active profile.");
    }

    const [
      balanceAdjustments,
      bills,
      budgetingPreferences,
      envelopes,
      notificationSettings,
      paychecks,
      purchases,
    ] = await Promise.all([
      this.balanceAdjustmentRepository.findAll(profile.id),
      this.billRepository.findAll(profile.id),
      this.budgetingPreferencesRepository.findByProfileId(profile.id),
      this.envelopeRepository.findAll(profile.id),
      this.notificationSettingsRepository.findByProfileId(profile.id),
      this.paycheckRepository.findAll(profile.id),
      this.purchaseRepository.findAll(profile.id),
    ]);
    const billCycleInstances = (
      await Promise.all(
        paychecks.map((paycheck) =>
          this.billCycleInstanceRepository.findByCycle(paycheck.id)
        )
      )
    ).flat();
    const records = {
      balanceAdjustments,
      billCycleInstances,
      bills,
      budgetingPreferences,
      envelopes,
      notificationSettings,
      paychecks,
      purchases,
    };

    return {
      schemaVersion: BUDGET_FLOW_BACKUP_SCHEMA_VERSION,
      exportedAt: this.now().toISOString(),
      profile,
      records,
      recordCount: countBackupRecords(records),
    };
  }

  async buildExportPackage(): Promise<BudgetFlowBackupExportPackage> {
    const payload = await this.buildExportPayload();

    return {
      fileName: createBackupFileName(payload.exportedAt),
      jsonText: JSON.stringify(payload, null, 2),
      payload,
      recordCount: payload.recordCount,
    };
  }

  async exportToDevice(): Promise<BudgetFlowBackupExportResult> {
    const backupMetadataRepository = this.options.backupMetadataRepository;

    if (!backupMetadataRepository) {
      throw new Error("Backup export requires a backup metadata repository.");
    }

    const exportPackage = await this.buildExportPackage();
    const writtenFile = await this.writeBackupPackage(exportPackage);
    const metadata = await backupMetadataRepository.create({
      profileId: exportPackage.payload.profile.id,
      eventType: "export",
      fileName: writtenFile.fileName,
      recordCount: writtenFile.recordCount,
    });

    await this.options.activityLogRepository?.create({
      profileId: exportPackage.payload.profile.id,
      eventType: "backup_exported",
      entityType: "backup",
      summary: `Exported backup ${writtenFile.fileName} with ${writtenFile.recordCount} records.`,
    });

    return {
      ...writtenFile,
      metadata,
    };
  }

  async restoreFromJson(
    jsonText: string,
    sourceFileName: string | null = null
  ): Promise<BudgetFlowBackupRestoreResult> {
    const payload = parseBudgetFlowBackupJson(jsonText);

    return this.restoreFromPayload(payload, sourceFileName);
  }

  async restoreFromPayload(
    payload: BudgetFlowBackupPayload,
    sourceFileName: string | null = null
  ): Promise<BudgetFlowBackupRestoreResult> {
    const backupMetadataRepository = this.options.backupMetadataRepository;
    const database = this.options.database;

    if (!backupMetadataRepository) {
      throw new Error("Backup restore requires a backup metadata repository.");
    }

    if (!database) {
      throw new Error("Backup restore requires a database executor.");
    }

    const activeProfile = await this.profileRepository.findActive();

    if (!activeProfile) {
      throw new Error("Backup restore requires an active profile.");
    }

    const restoreResult = await restoreBackupPayload(
      database,
      payload,
      activeProfile.id,
      sourceFileName
    );
    const metadata = await backupMetadataRepository.create({
      profileId: restoreResult.profileId,
      eventType: "restore",
      fileName: sourceFileName,
      recordCount: restoreResult.recordCount,
    });

    await this.options.activityLogRepository?.create({
      profileId: restoreResult.profileId,
      eventType: "backup_restored",
      entityType: "backup",
      summary: sourceFileName
        ? `Restored backup ${sourceFileName} with ${restoreResult.recordCount} records.`
        : `Restored backup with ${restoreResult.recordCount} records.`,
    });

    return {
      ...restoreResult,
      metadata,
    };
  }

  async importFromDevice(): Promise<BudgetFlowBackupRestoreResult | null> {
    const pickedFile = await this.readPickedBackupFile();

    if (!pickedFile) {
      return null;
    }

    return this.restoreFromJson(pickedFile.jsonText, pickedFile.fileName);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  private writeBackupPackage(exportPackage: BudgetFlowBackupExportPackage) {
    return (
      this.options.writeBackupPackage ?? writeBackupPackageToDevice
    )(exportPackage);
  }

  private readPickedBackupFile() {
    const pickBackupFile = this.options.pickBackupFile ?? pickAndReadBackupFile;

    return pickBackupFile();
  }
}
