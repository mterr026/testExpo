import { useState } from "react";

import { useFinancialState } from "@/context/FinancialStateContext";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { useProfile } from "@/context/ProfileContext";
import type { OnboardingStep } from "@/features/onboarding/OnboardingModal";
import { parseDollarInputToCents } from "@/shared/currency";
import { getAppRuntime } from "@/shared/services/appRuntime";

type UseOnboardingControllerInput = {
  onOnboardingComplete?: () => void | Promise<void>;
  getPendingImportSuggestionCount?: () => number;
  clearImportSuggestions?: () => void | Promise<void>;
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function useOnboardingController({
  onOnboardingComplete,
  getPendingImportSuggestionCount,
  clearImportSuggestions,
}: UseOnboardingControllerInput = {}) {
  const { refreshDashboardSnapshot } = useFinancialState();
  const { profile } = useProfile();
  const { isOnboardingRequired } = useOnboardingContext();
  const [step, setStep] = useState<OnboardingStep>("balance");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [reserveAmount, setReserveAmount] = useState("");
  const [pendingOpeningBalanceCents, setPendingOpeningBalanceCents] = useState(0);
  const [pendingEssentialReserveCents, setPendingEssentialReserveCents] =
    useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function resetOnboardingForm() {
    setBalanceAmount("");
    setReserveAmount("");
    setStep("balance");
    setPendingOpeningBalanceCents(0);
    setPendingEssentialReserveCents(0);
  }

  async function finishOnboarding(
    openingBalanceCents: number,
    essentialReserveCents: number
  ) {
    const profileId = profile?.id;

    if (!profileId) {
      setError("Profile could not be loaded.");
      return false;
    }

    setIsSaving(true);
    setError("");

    try {
      const runtime = await getAppRuntime();

      await runtime.services.onboardingService.completeOnboarding(profileId, {
        openingBalanceCents,
        essentialReserveCents,
      });

      await refreshDashboardSnapshot();
      await onOnboardingComplete?.();

      const dbProfile =
        await runtime.repositories.profileRepository.findById(profileId);

      if (!dbProfile?.onboardingComplete) {
        setError("Onboarding could not be marked complete.");
        return false;
      }

      resetOnboardingForm();
      return true;
    } catch (finishError) {
      setError(`Onboarding could not be saved. ${formatError(finishError)}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function continueOnboarding() {
    if (step === "balance") {
      const openingBalanceCents = parseDollarInputToCents(balanceAmount);

      if (openingBalanceCents === null) {
        setError("Enter a valid balance amount.");
        return;
      }

      setPendingOpeningBalanceCents(openingBalanceCents);
      setError("");
      setStep("reserve");
      return;
    }

    if (step === "reserve") {
      const essentialReserveCents = parseDollarInputToCents(reserveAmount);

      if (essentialReserveCents === null) {
        setError("Enter a valid reserve amount.");
        return;
      }

      setPendingEssentialReserveCents(essentialReserveCents);
      setError("");
      setStep("import");
      return;
    }

    const pendingImportCount = getPendingImportSuggestionCount?.() ?? 0;

    if (pendingImportCount > 0) {
      setError(
        `Review ${pendingImportCount} import suggestion${pendingImportCount === 1 ? "" : "s"} first. Confirm each as a paycheck or bill, or ignore it.`
      );
      return;
    }

    await finishOnboarding(
      pendingOpeningBalanceCents,
      pendingEssentialReserveCents
    );
  }

  async function skipOnboarding() {
    if (step === "reserve") {
      setPendingEssentialReserveCents(0);
      setError("");
      setStep("import");
      return;
    }

    if (step === "import") {
      await clearImportSuggestions?.();
    }

    await finishOnboarding(
      pendingOpeningBalanceCents,
      pendingEssentialReserveCents
    );
  }

  return {
    onboarding: {
      balanceAmount,
      error,
      isSaving,
      reserveAmount,
      setBalanceAmount,
      setReserveAmount,
      continueOnboarding,
      skipOnboarding,
      step,
      visible: isOnboardingRequired,
    },
  };
}
