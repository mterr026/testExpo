import {
  ActivityLogRepository,
  BalanceAdjustmentRepository,
  BackupMetadataRepository,
  BillCycleInstanceRepository,
  BillRepository,
  ImportSuggestionRepository,
  NotificationSettingsRepository,
  PaycheckRepository,
  ProfileRepository,
  PurchaseRepository,
  SyncQueueRepository,
} from "@/database/repositories";
import type { TransactionalDatabaseExecutor } from "@/database/repositories/types";
import { BackupService } from "@/features/backup/services";
import { BillService } from "@/features/bills/services";
import { DashboardService } from "@/features/dashboard/services";
import { ImportService } from "@/features/import/services";
import { PaycheckService } from "@/features/paychecks/services";
import { PurchaseService } from "@/features/purchases/services";
import { SettingsService } from "@/features/settings/services";
import { NotificationService } from "@/features/notifications/services";
import { OnboardingService } from "@/features/onboarding/services/OnboardingService";
import type { FinancialEventBus } from "@/shared/events/financialEvents";

import { createLocalId } from "./idFactory";

export type AppRepositories = {
  activityLogRepository: ActivityLogRepository;
  balanceAdjustmentRepository: BalanceAdjustmentRepository;
  backupMetadataRepository: BackupMetadataRepository;
  billCycleInstanceRepository: BillCycleInstanceRepository;
  billRepository: BillRepository;
  importSuggestionRepository: ImportSuggestionRepository;
  notificationSettingsRepository: NotificationSettingsRepository;
  paycheckRepository: PaycheckRepository;
  profileRepository: ProfileRepository;
  purchaseRepository: PurchaseRepository;
  syncQueueRepository: SyncQueueRepository;
};

export type AppServices = {
  backupService: BackupService;
  billService: BillService;
  dashboardService: DashboardService;
  importService: ImportService;
  notificationService: NotificationService;
  onboardingService: OnboardingService;
  paycheckService: PaycheckService;
  purchaseService: PurchaseService;
  settingsService: SettingsService;
};

export type AppServiceContainer = {
  repositories: AppRepositories;
  services: AppServices;
};

export function createAppServices(
  db: TransactionalDatabaseExecutor,
  eventBus: FinancialEventBus
): AppServiceContainer {
  const repositories = createRepositories(db);
  const billService = new BillService(
    repositories.billRepository,
    repositories.billCycleInstanceRepository,
    repositories.activityLogRepository,
    eventBus
  );
  const paycheckService = new PaycheckService(
    repositories.paycheckRepository,
    repositories.activityLogRepository,
    eventBus
  );

  return {
    repositories,
    services: {
      backupService: new BackupService(
        repositories.profileRepository,
        repositories.paycheckRepository,
        repositories.billRepository,
        repositories.billCycleInstanceRepository,
        repositories.purchaseRepository,
        repositories.balanceAdjustmentRepository,
        repositories.notificationSettingsRepository,
        {
          activityLogRepository: repositories.activityLogRepository,
          backupMetadataRepository: repositories.backupMetadataRepository,
        }
      ),
      billService,
      dashboardService: new DashboardService(
        repositories.profileRepository,
        repositories.paycheckRepository,
        repositories.purchaseRepository,
        repositories.billRepository,
        repositories.billCycleInstanceRepository
      ),
      importService: new ImportService(
        repositories.importSuggestionRepository,
        billService,
        paycheckService,
        {
          createImportSessionId: createLocalId,
        }
      ),
      notificationService: new NotificationService(),
      onboardingService: new OnboardingService(
        repositories.profileRepository,
        eventBus
      ),
      paycheckService,
      purchaseService: new PurchaseService(
        repositories.purchaseRepository,
        paycheckService,
        repositories.activityLogRepository,
        eventBus
      ),
      settingsService: new SettingsService(
        repositories.profileRepository,
        repositories.notificationSettingsRepository,
        repositories.activityLogRepository,
        eventBus
      ),
    },
  };
}

function createRepositories(db: TransactionalDatabaseExecutor): AppRepositories {
  return {
    activityLogRepository: new ActivityLogRepository(db, createLocalId),
    balanceAdjustmentRepository: new BalanceAdjustmentRepository(db, createLocalId),
    backupMetadataRepository: new BackupMetadataRepository(db, createLocalId),
    billCycleInstanceRepository: new BillCycleInstanceRepository(
      db,
      createLocalId
    ),
    billRepository: new BillRepository(db, createLocalId),
    importSuggestionRepository: new ImportSuggestionRepository(db, createLocalId),
    notificationSettingsRepository: new NotificationSettingsRepository(
      db,
      createLocalId
    ),
    paycheckRepository: new PaycheckRepository(db, createLocalId),
    profileRepository: new ProfileRepository(db, createLocalId),
    purchaseRepository: new PurchaseRepository(db, createLocalId),
    syncQueueRepository: new SyncQueueRepository(db, createLocalId),
  };
}
