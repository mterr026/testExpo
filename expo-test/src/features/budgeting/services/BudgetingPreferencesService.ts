import type { BudgetingPreferencesRepository } from "@/database/repositories";
import type { BudgetingPreferences } from "@/database/repositories/types";
import {
  FINANCIAL_STATE_CHANGED,
  type FinancialEventBus,
} from "@/shared/events/financialEvents";

export class BudgetingPreferencesService {
  constructor(
    private readonly budgetingPreferencesRepository: BudgetingPreferencesRepository,
    private readonly eventBus: FinancialEventBus
  ) {}

  async getOrCreate(profileId: string): Promise<BudgetingPreferences> {
    const existing =
      await this.budgetingPreferencesRepository.findByProfileId(profileId);

    if (existing) {
      return existing;
    }

    return this.budgetingPreferencesRepository.create({ profileId });
  }

  async setEnvelopesEnabled(
    profileId: string,
    envelopesEnabled: boolean
  ): Promise<BudgetingPreferences> {
    await this.getOrCreate(profileId);

    const updated = await this.budgetingPreferencesRepository.update(profileId, {
      envelopesEnabled,
    });
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profileId);

    return updated;
  }
}
