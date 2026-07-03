import type { Profile } from "@/database/repositories/types";

import type { AppRuntime } from "./appRuntime";

export async function getOrCreateActiveProfile(
  runtime: AppRuntime
): Promise<Profile> {
  const existing = await runtime.repositories.profileRepository.findActive();

  if (existing) {
    return existing;
  }

  return runtime.repositories.profileRepository.create();
}
