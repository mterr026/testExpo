import { describe, expect, it } from "vitest";

import type { DemoPreviewState } from "./demoPreviewStorage";

function shouldDeferOnboarding({
  demoPreviewState,
  isOnboardingRequired,
  tutorialComplete,
}: {
  demoPreviewState: DemoPreviewState | null;
  isOnboardingRequired: boolean;
  tutorialComplete: boolean;
}) {
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

  return showDemoWelcome || showDemoStory || isDemoExploring;
}

function shouldShowOnboarding({
  isOnboardingRequired,
  shouldDeferOnboarding,
}: {
  isOnboardingRequired: boolean;
  shouldDeferOnboarding: boolean;
}) {
  return isOnboardingRequired && !shouldDeferOnboarding;
}

describe("demo preview onboarding gating", () => {
  it("shows_welcome_before_onboarding_on_first_launch", () => {
    expect(
      shouldDeferOnboarding({
        demoPreviewState: null,
        isOnboardingRequired: true,
        tutorialComplete: false,
      })
    ).toBe(true);

    expect(
      shouldShowOnboarding({
        isOnboardingRequired: true,
        shouldDeferOnboarding: true,
      })
    ).toBe(false);
  });

  it("defers_onboarding_during_story_slides", () => {
    expect(
      shouldDeferOnboarding({
        demoPreviewState: "story",
        isOnboardingRequired: true,
        tutorialComplete: false,
      })
    ).toBe(true);
  });

  it("defers_onboarding_while_exploring_sample_data", () => {
    expect(
      shouldDeferOnboarding({
        demoPreviewState: "exploring",
        isOnboardingRequired: true,
        tutorialComplete: false,
      })
    ).toBe(true);
  });

  it("shows_onboarding_after_demo_is_done", () => {
    expect(
      shouldDeferOnboarding({
        demoPreviewState: "done",
        isOnboardingRequired: true,
        tutorialComplete: true,
      })
    ).toBe(false);

    expect(
      shouldShowOnboarding({
        isOnboardingRequired: true,
        shouldDeferOnboarding: false,
      })
    ).toBe(true);
  });

  it("shows_onboarding_when_tutorial_was_already_completed", () => {
    expect(
      shouldDeferOnboarding({
        demoPreviewState: "pending",
        isOnboardingRequired: true,
        tutorialComplete: true,
      })
    ).toBe(false);
  });

  it("does_not_show_onboarding_or_demo_when_setup_is_complete", () => {
    expect(
      shouldShowOnboarding({
        isOnboardingRequired: false,
        shouldDeferOnboarding: false,
      })
    ).toBe(false);
  });
});
