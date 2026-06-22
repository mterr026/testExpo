import type { ProfileRepository } from "@/database/repositories";
import type { Profile } from "@/database/repositories/types";
import {
  FINANCIAL_STATE_CHANGED,
  type FinancialEventBus,
} from "@/shared/events/financialEvents";

export type CompleteOnboardingInput = {
  openingBalanceCents: number;
  essentialReserveCents: number;
};

export class OnboardingService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly eventBus: FinancialEventBus
  ) {}

  async completeOpeningBalance(
    profileId: string,
    openingBalanceCents: number
  ): Promise<Profile> {
    return this.completeOnboarding(profileId, {
      openingBalanceCents,
      essentialReserveCents: 0,
    });
  }

  async completeOnboarding(
    profileId: string,
    input: CompleteOnboardingInput
  ): Promise<Profile> {
    validateOpeningBalance(input.openingBalanceCents);
    validateEssentialReserve(input.essentialReserveCents);

    const profile = await this.profileRepository.update(profileId, {
      openingBalanceCents: input.openingBalanceCents,
      essentialReserveCents: input.essentialReserveCents,
      onboardingComplete: true,
    });

    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profile.id);

    return profile;
  }

  async saveOnboardingProgress(
    profileId: string,
    input: CompleteOnboardingInput
  ): Promise<Profile> {
    validateOpeningBalance(input.openingBalanceCents);
    validateEssentialReserve(input.essentialReserveCents);

    const profile = await this.profileRepository.update(profileId, {
      openingBalanceCents: input.openingBalanceCents,
      essentialReserveCents: input.essentialReserveCents,
    });

    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profile.id);

    return profile;
  }
}

function validateOpeningBalance(openingBalanceCents: number) {
  if (!Number.isInteger(openingBalanceCents)) {
    throw new Error("Opening balance must be a whole number of cents.");
  }
}

function validateEssentialReserve(essentialReserveCents: number) {
  if (!Number.isInteger(essentialReserveCents) || essentialReserveCents < 0) {
    throw new Error("Essential reserve must be zero or greater.");
  }
}
