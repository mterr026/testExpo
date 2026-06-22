import { describe, expect, it, vi } from "vitest";

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
import { BackupService } from "@/features/backup/services";
import { BillService } from "@/features/bills/services";
import { DashboardService } from "@/features/dashboard/services";
import { ImportService } from "@/features/import/services";
import { NotificationService } from "@/features/notifications/services";
import { OnboardingService } from "@/features/onboarding/services/OnboardingService";
import { PaycheckService } from "@/features/paychecks/services";
import { PurchaseService } from "@/features/purchases/services";
import { SettingsService } from "@/features/settings/services";
import { FakeDatabase } from "@/database/repositories/testUtils";

import { createAppServices } from "./createAppServices";

describe("createAppServices", () => {
  it("creates_repositories_and_services_from_shared_database_executor", () => {
    const db = new FakeDatabase();
    const eventBus = { emit: vi.fn() };

    const container = createAppServices(db, eventBus);

    expect(container.repositories.activityLogRepository).toBeInstanceOf(
      ActivityLogRepository
    );
    expect(container.repositories.balanceAdjustmentRepository).toBeInstanceOf(
      BalanceAdjustmentRepository
    );
    expect(container.repositories.backupMetadataRepository).toBeInstanceOf(
      BackupMetadataRepository
    );
    expect(container.repositories.billCycleInstanceRepository).toBeInstanceOf(
      BillCycleInstanceRepository
    );
    expect(container.repositories.billRepository).toBeInstanceOf(BillRepository);
    expect(container.repositories.importSuggestionRepository).toBeInstanceOf(
      ImportSuggestionRepository
    );
    expect(container.repositories.notificationSettingsRepository).toBeInstanceOf(
      NotificationSettingsRepository
    );
    expect(container.repositories.paycheckRepository).toBeInstanceOf(
      PaycheckRepository
    );
    expect(container.repositories.profileRepository).toBeInstanceOf(
      ProfileRepository
    );
    expect(container.repositories.purchaseRepository).toBeInstanceOf(
      PurchaseRepository
    );
    expect(container.repositories.syncQueueRepository).toBeInstanceOf(
      SyncQueueRepository
    );

    expect(container.services.backupService).toBeInstanceOf(BackupService);
    expect(container.services.billService).toBeInstanceOf(BillService);
    expect(container.services.dashboardService).toBeInstanceOf(DashboardService);
    expect(container.services.importService).toBeInstanceOf(ImportService);
    expect(container.services.notificationService).toBeInstanceOf(
      NotificationService
    );
    expect(container.services.onboardingService).toBeInstanceOf(OnboardingService);
    expect(container.services.paycheckService).toBeInstanceOf(PaycheckService);
    expect(container.services.purchaseService).toBeInstanceOf(PurchaseService);
    expect(container.services.settingsService).toBeInstanceOf(SettingsService);
  });
});
