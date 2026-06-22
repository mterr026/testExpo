import type { Profile } from "@/database/repositories/types";
import type { Screen } from "@/shared/ui/types";
import type { AppRuntime } from "@/shared/services/appRuntime";

export const screenOrder: Screen[] = [
  "Dashboard",
  "Purchases",
  "Bills",
  "Paychecks",
  "Settings",
];

export function getTodayIsoDate() {
  const now = new Date();

  return buildLocalIsoDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
}

function buildLocalIsoDate(year: number, month: number, day: number) {
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

export async function getOrCreateActiveProfile(
  runtime: AppRuntime
): Promise<Profile> {
  const existing = await runtime.repositories.profileRepository.findActive();

  if (existing) {
    return existing;
  }

  return runtime.repositories.profileRepository.create();
}
