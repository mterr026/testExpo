import type {
  ActivityLogEntry,
  BalanceAdjustment,
  BackupMetadata,
  Bill,
  BillCycleInstance,
  NotificationSettings,
  NewActivityLogEntry,
  NewBackupMetadata,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";

import {
  writeBackupPackageToDevice,
  type WrittenBackupFile,
} from "./BackupFileExport";
import {
  BUDGET_FLOW_BACKUP_SCHEMA_VERSION,
  countBackupRecords,
} from "./BackupContract";

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

type BackupMetadataRepository = {
  create(input: NewBackupMetadata): Promise<BackupMetadata>;
};

type BackupActivityLogRepository = {
  create(input: NewActivityLogEntry): Promise<ActivityLogEntry>;
};

type BackupPackageWriter = (
  exportPackage: BudgetFlowBackupExportPackage
) => Promise<WrittenBackupFile>;

export type BudgetFlowBackupPayload = {
  schemaVersion: 1;
  exportedAt: string;
  profile: Profile;
  records: {
    balanceAdjustments: BalanceAdjustment[];
    billCycleInstances: BillCycleInstance[];
    bills: Bill[];
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

type BackupServiceOptions = {
  activityLogRepository?: BackupActivityLogRepository;
  backupMetadataRepository?: BackupMetadataRepository;
  now?: () => Date;
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
      notificationSettings,
      paychecks,
      purchases,
    ] = await Promise.all([
      this.balanceAdjustmentRepository.findAll(profile.id),
      this.billRepository.findAll(profile.id),
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

  private now() {
    return this.options.now?.() ?? new Date();
  }

  private writeBackupPackage(exportPackage: BudgetFlowBackupExportPackage) {
    return (
      this.options.writeBackupPackage ?? writeBackupPackageToDevice
    )(exportPackage);
  }
}

function createBackupFileName(exportedAt: string) {
  return `budget-flow-backup-${exportedAt
    .replaceAll(":", "")
    .replaceAll(".", "")
    .replace("T", "-")
    .replace("Z", "Z")}.json`;
}
