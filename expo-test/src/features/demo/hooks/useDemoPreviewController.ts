import { useCallback, useEffect, useState } from "react";

import { useOnboardingContext } from "@/context/OnboardingContext";
import { useProfile } from "@/context/ProfileContext";
import { getAppRuntime } from "@/shared/services/appRuntime";

import {
  clearDemoFinancialData,
  seedDemoFinancialData,
} from "../DemoSeedService";
import {
  loadDemoPreviewState,
  saveDemoPreviewState,
  type DemoPreviewState,
} from "../demoPreviewStorage";

type UseDemoPreviewControllerInput = {
  onDemoStateChanged?: () => void | Promise<void>;
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function useDemoPreviewController({
  onDemoStateChanged,
}: UseDemoPreviewControllerInput = {}) {
  const { profile } = useProfile();
  const { isOnboardingRequired } = useOnboardingContext();
  const [demoPreviewState, setDemoPreviewState] =
    useState<DemoPreviewState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const profileId = profile?.id;
  const tutorialComplete = profile?.tutorialComplete === true;

  useEffect(() => {
    if (!profileId) {
      return;
    }

    if (!isOnboardingRequired) {
      setDemoPreviewState("done");
      return;
    }

    let cancelled = false;

    async function loadState() {
      const storedState = await loadDemoPreviewState(profileId);

      if (cancelled) {
        return;
      }

      if (tutorialComplete && storedState !== "done") {
        await saveDemoPreviewState(profileId, "done");
        setDemoPreviewState("done");
        return;
      }

      setDemoPreviewState(storedState);

      if (storedState === "exploring") {
        try {
          await seedDemoFinancialData(profileId);
          await onDemoStateChanged?.();
        } catch (seedError) {
          console.error("Demo data could not be restored.", seedError);
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [isOnboardingRequired, onDemoStateChanged, profileId, tutorialComplete]);

  const effectiveDemoState: DemoPreviewState | null = isOnboardingRequired
    ? (demoPreviewState ?? "pending")
    : "done";

  const showDemoWelcome =
    isOnboardingRequired &&
    effectiveDemoState === "pending" &&
    !tutorialComplete;

  const showDemoStory =
    isOnboardingRequired &&
    effectiveDemoState === "story" &&
    !tutorialComplete;

  const isDemoExploring =
    isOnboardingRequired &&
    effectiveDemoState === "exploring" &&
    !tutorialComplete;

  const shouldDeferOnboarding =
    showDemoWelcome || showDemoStory || isDemoExploring;

  const startDemoStory = useCallback(async () => {
    if (!profileId) {
      setError("Profile could not be loaded.");
      return false;
    }

    setIsBusy(true);
    setError("");

    try {
      await saveDemoPreviewState(profileId, "story");
      setDemoPreviewState("story");
      return true;
    } catch (startError) {
      setError(`Tour could not be started. ${formatError(startError)}`);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [profileId]);

  const backToDemoWelcome = useCallback(async () => {
    if (!profileId) {
      return false;
    }

    await saveDemoPreviewState(profileId, "pending");
    setDemoPreviewState("pending");
    setError("");
    return true;
  }, [profileId]);

  const enterDemoExplore = useCallback(async () => {
    if (!profileId) {
      setError("Profile could not be loaded.");
      return false;
    }

    setIsBusy(true);
    setError("");

    try {
      await seedDemoFinancialData(profileId);
      await saveDemoPreviewState(profileId, "exploring");
      setDemoPreviewState("exploring");
      await onDemoStateChanged?.();
      return true;
    } catch (exploreError) {
      setError(`Sample data could not be loaded. ${formatError(exploreError)}`);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [onDemoStateChanged, profileId]);

  const skipDemoWelcome = useCallback(async () => {
    if (!profileId) {
      setError("Profile could not be loaded.");
      return false;
    }

    setIsBusy(true);
    setError("");

    try {
      await saveDemoPreviewState(profileId, "done");
      setDemoPreviewState("done");
      const runtime = await getAppRuntime();
      await runtime.services.tutorialService.completeTutorial(profileId);
      await onDemoStateChanged?.();
      return true;
    } catch (skipError) {
      setError(`Setup could not continue. ${formatError(skipError)}`);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [onDemoStateChanged, profileId]);

  const finishDemoExplore = useCallback(async () => {
    if (!profileId) {
      setError("Profile could not be loaded.");
      return false;
    }

    setIsBusy(true);
    setError("");

    try {
      await clearDemoFinancialData(profileId);
      await saveDemoPreviewState(profileId, "done");
      setDemoPreviewState("done");
      const runtime = await getAppRuntime();
      await runtime.services.tutorialService.completeTutorial(profileId);
      await onDemoStateChanged?.();
      return true;
    } catch (finishError) {
      setError(`Demo could not be cleared. ${formatError(finishError)}`);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [onDemoStateChanged, profileId]);

  return {
    demoPreview: {
      backToDemoWelcome,
      enterDemoExplore,
      error,
      finishDemoExplore,
      isBusy,
      isDemoExploring,
      shouldDeferOnboarding,
      showDemoStory,
      showDemoWelcome,
      skipDemoWelcome,
      startDemoStory,
    },
  };
}
