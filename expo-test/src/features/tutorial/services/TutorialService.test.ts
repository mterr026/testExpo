import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfileRepository } from "@/database/repositories";
import type { Profile } from "@/database/repositories/types";

import { TutorialService } from "./TutorialService";

const profile: Profile = {
  id: "profile-1",
  displayName: null,
  essentialReserveCents: 0,
  currencyCode: "USD",
  onboardingComplete: true,
  openingBalanceCents: 10000,
  tutorialComplete: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

describe("TutorialService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completeTutorial_marks_tutorial_complete_on_profile", async () => {
    const profileRepository = {
      update: vi.fn(),
    };
    const service = new TutorialService(
      profileRepository as unknown as ProfileRepository
    );
    const updatedProfile = {
      ...profile,
      tutorialComplete: true,
    };

    profileRepository.update.mockResolvedValue(updatedProfile);

    await expect(service.completeTutorial("profile-1")).resolves.toEqual(
      updatedProfile
    );
    expect(profileRepository.update).toHaveBeenCalledWith("profile-1", {
      tutorialComplete: true,
    });
  });
});
