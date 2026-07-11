import { describe, expect, it } from "vitest";

import { screenOrder } from "@/features/home/screenOrder";

import { tutorialSteps } from "./tutorialSteps";
import { tutorialTargetIds } from "./tutorialTargets";

describe("tutorialSteps", () => {
  it("defines_a_step_for_each_tutorial_screen", () => {
    const screens = new Set(tutorialSteps.map((step) => step.screen));

    expect(screens.has("Dashboard")).toBe(true);
    expect(screens.has("Paychecks")).toBe(true);
    expect(screens.has("Settings")).toBe(true);
  });

  it("uses_registered_target_ids_and_valid_screens", () => {
    for (const step of tutorialSteps) {
      expect(tutorialTargetIds).toContain(step.targetId);
      expect(screenOrder).toContain(step.screen);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("covers_safe_to_spend_paychecks_and_settings", () => {
    const targetIds = tutorialSteps.map((step) => step.targetId);

    expect(targetIds).toContain("dashboard-safe-to-spend");
    expect(targetIds).toContain("dashboard-breakdown");
    expect(targetIds).toContain("paychecks-summary");
    expect(targetIds).toContain("paychecks-upcoming");
    expect(targetIds).toContain("paychecks-row-overflow");
    expect(targetIds).toContain("paychecks-coverage-breakdown");
    expect(targetIds).toContain("paychecks-additional-income");
    expect(targetIds).toContain("dashboard-fab");
    expect(targetIds).toContain("settings-current-balance");
    expect(targetIds).toContain("settings-essential-reserve");
    expect(targetIds).toContain("settings-preferences");
  });
});
