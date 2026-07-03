import { useEffect, useState } from "react";

import { useOnboardingContext } from "@/context/OnboardingContext";
import { useProfile } from "@/context/ProfileContext";
import { tutorialSteps } from "@/features/tutorial/tutorialSteps";
import { getAppRuntime } from "@/shared/services/appRuntime";
import type { Screen } from "@/shared/ui/types";

type UseTutorialControllerInput = {
  changeScreen?: (screen: Screen) => void;
  onTutorialComplete?: () => void | Promise<void>;
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function useTutorialController({
  changeScreen,
  onTutorialComplete,
}: UseTutorialControllerInput = {}) {
  const { profile } = useProfile();
  const { isOnboardingRequired } = useOnboardingContext();
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const isTutorialRequired =
    !isOnboardingRequired &&
    profile?.onboardingComplete === true &&
    profile?.tutorialComplete === false;

  const currentStep = tutorialSteps[stepIndex] ?? null;

  useEffect(() => {
    if (!isTutorialRequired || !changeScreen || !currentStep) {
      return;
    }

    changeScreen(currentStep.screen);
  }, [changeScreen, currentStep, isTutorialRequired, stepIndex]);

  async function dismissTutorial() {
    const profileId = profile?.id;

    if (!profileId) {
      setError("Profile could not be loaded.");
      return false;
    }

    setIsSaving(true);
    setError("");

    try {
      const runtime = await getAppRuntime();

      await runtime.services.tutorialService.completeTutorial(profileId);
      await onTutorialComplete?.();
      setStepIndex(0);
      return true;
    } catch (dismissError) {
      setError(`Tutorial could not be saved. ${formatError(dismissError)}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function nextTutorialStep() {
    if (stepIndex < tutorialSteps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    await dismissTutorial();
  }

  async function skipTutorial() {
    await dismissTutorial();
  }

  return {
    tutorial: {
      currentStep,
      error,
      isSaving,
      nextTutorialStep,
      skipTutorial,
      stepIndex,
      stepCount: tutorialSteps.length,
      visible: isTutorialRequired,
    },
  };
}
