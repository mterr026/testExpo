import type { ProfileRepository } from "@/database/repositories";
import type { Profile } from "@/database/repositories/types";

export class TutorialService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async completeTutorial(profileId: string): Promise<Profile> {
    return this.profileRepository.update(profileId, {
      tutorialComplete: true,
    });
  }
}
