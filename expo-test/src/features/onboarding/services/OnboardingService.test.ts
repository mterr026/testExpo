import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfileRepository } from "@/database/repositories";
import type { Profile } from "@/database/repositories/types";
import { FINANCIAL_STATE_CHANGED } from "@/shared/events/financialEvents";

import { OnboardingService } from "./OnboardingService";

const profile: Profile = {
  id: "profile-1",
  displayName: null,
  essentialReserveCents: 0,
  currencyCode: "USD",
  onboardingComplete: false,
  openingBalanceCents: 0,
  tutorialComplete: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

function createMocks() {
  return {
    profileRepository: {
      update: vi.fn(),
    },
    eventBus: {
      emit: vi.fn(),
    },
  };
}

function createService(mocks: ReturnType<typeof createMocks>) {
  return new OnboardingService(
    mocks.profileRepository as unknown as ProfileRepository,
    mocks.eventBus
  );
}

describe("OnboardingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completeOnboarding_saves_balance_reserve_and_marks_onboarding_complete", async () => {
    const mocks = createMocks();
    const service = createService(mocks);
    const updatedProfile = {
      ...profile,
      openingBalanceCents: 125000,
      essentialReserveCents: 10000,
      onboardingComplete: true,
    };

    mocks.profileRepository.update.mockResolvedValue(updatedProfile);

    await expect(
      service.completeOnboarding("profile-1", {
        openingBalanceCents: 125000,
        essentialReserveCents: 10000,
      })
    ).resolves.toEqual(updatedProfile);
    expect(mocks.profileRepository.update).toHaveBeenCalledWith("profile-1", {
      openingBalanceCents: 125000,
      essentialReserveCents: 10000,
      onboardingComplete: true,
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("completeOpeningBalance_saves_balance_and_marks_onboarding_complete", async () => {
    const mocks = createMocks();
    const service = createService(mocks);
    const updatedProfile = {
      ...profile,
      openingBalanceCents: 125000,
      onboardingComplete: true,
    };

    mocks.profileRepository.update.mockResolvedValue(updatedProfile);

    await expect(
      service.completeOpeningBalance("profile-1", 125000)
    ).resolves.toEqual(updatedProfile);
    expect(mocks.profileRepository.update).toHaveBeenCalledWith("profile-1", {
      openingBalanceCents: 125000,
      essentialReserveCents: 0,
      onboardingComplete: true,
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("completeOpeningBalance_allows_zero_for_skip", async () => {
    const mocks = createMocks();
    const service = createService(mocks);
    const updatedProfile = {
      ...profile,
      onboardingComplete: true,
    };

    mocks.profileRepository.update.mockResolvedValue(updatedProfile);

    await service.completeOpeningBalance("profile-1", 0);

    expect(mocks.profileRepository.update).toHaveBeenCalledWith("profile-1", {
      openingBalanceCents: 0,
      essentialReserveCents: 0,
      onboardingComplete: true,
    });
  });

  it("saveOnboardingProgress_saves_balance_and_reserve_without_completing_onboarding", async () => {
    const mocks = createMocks();
    const service = createService(mocks);
    const updatedProfile = {
      ...profile,
      openingBalanceCents: 125000,
      essentialReserveCents: 10000,
    };

    mocks.profileRepository.update.mockResolvedValue(updatedProfile);

    await expect(
      service.saveOnboardingProgress("profile-1", {
        openingBalanceCents: 125000,
        essentialReserveCents: 10000,
      })
    ).resolves.toEqual(updatedProfile);
    expect(mocks.profileRepository.update).toHaveBeenCalledWith("profile-1", {
      openingBalanceCents: 125000,
      essentialReserveCents: 10000,
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("completeOnboarding_rejects_negative_reserve", async () => {
    const mocks = createMocks();
    const service = createService(mocks);

    await expect(
      service.completeOnboarding("profile-1", {
        openingBalanceCents: 0,
        essentialReserveCents: -100,
      })
    ).rejects.toThrow("Essential reserve must be zero or greater.");
    expect(mocks.profileRepository.update).not.toHaveBeenCalled();
  });
});
