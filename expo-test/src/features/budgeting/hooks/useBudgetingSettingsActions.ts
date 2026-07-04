import { useEffect, useState } from "react";

import type { BudgetingPreferences } from "@/database/repositories/types";
import { getAppRuntime } from "@/shared/services/appRuntime";

type UseBudgetingSettingsActionsInput = {
  onSettingsChanged?: () => void | Promise<void>;
  profileId?: string;
};

export function useBudgetingSettingsActions({
  onSettingsChanged,
  profileId,
}: UseBudgetingSettingsActionsInput) {
  const [budgetingPreferences, setBudgetingPreferences] =
    useState<BudgetingPreferences | null>(null);
  const [envelopeToggleError, setEnvelopeToggleError] = useState("");
  const [isEnvelopesToggleSaving, setIsEnvelopesToggleSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadBudgetingPreferences() {
      if (!profileId) {
        setBudgetingPreferences(null);
        setEnvelopeToggleError("");
        return;
      }

      try {
        const runtime = await getAppRuntime();
        const preferences =
          await runtime.services.budgetingPreferencesService.getOrCreate(
            profileId
          );

        if (isActive) {
          setBudgetingPreferences(preferences);
          setEnvelopeToggleError("");
        }
      } catch {
        if (isActive) {
          setEnvelopeToggleError("Envelope settings could not be loaded.");
        }
      }
    }

    void loadBudgetingPreferences();

    return () => {
      isActive = false;
    };
  }, [profileId]);

  async function toggleEnvelopes() {
    if (!profileId) {
      return;
    }

    const runtime = await getAppRuntime();
    const currentPreferences =
      budgetingPreferences ??
      (await runtime.services.budgetingPreferencesService.getOrCreate(profileId));
    const turningOn = !currentPreferences.envelopesEnabled;

    try {
      setIsEnvelopesToggleSaving(true);
      setEnvelopeToggleError("");

      const updated =
        await runtime.services.budgetingPreferencesService.setEnvelopesEnabled(
          profileId,
          turningOn
        );

      setBudgetingPreferences(updated);
      await onSettingsChanged?.();
    } catch {
      setEnvelopeToggleError("Envelope settings could not be saved.");
    } finally {
      setIsEnvelopesToggleSaving(false);
    }
  }

  return {
    budgetingPreferences,
    envelopeToggleError,
    isEnvelopesToggleSaving,
    setBudgetingPreferences,
    toggleEnvelopes,
  };
}
