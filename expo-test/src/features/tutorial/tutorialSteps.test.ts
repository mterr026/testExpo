import { describe, expect, it } from "vitest";

import { screenOrder } from "@/features/app/homeData";

import { tutorialSteps } from "./tutorialSteps";
import { tutorialTargetIds } from "./tutorialTargets";

describe("tutorialSteps", () => {
  it("defines_a_step_for_each_major_home_panel", () => {
    const screens = new Set(tutorialSteps.map((step) => step.screen));

    expect(screens.has("Dashboard")).toBe(true);
    expect(screens.has("Paychecks")).toBe(true);
    expect(screens.has("Bills")).toBe(true);
    expect(screens.has("Purchases")).toBe(true);
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

  it("covers_safe_to_spend_paychecks_bills_purchases_and_settings", () => {
    const targetIds = tutorialSteps.map((step) => step.targetId);

    expect(targetIds).toContain("dashboard-safe-to-spend");
    expect(targetIds).toContain("dashboard-breakdown");
    expect(targetIds).toContain("paychecks-summary");
    expect(targetIds).toContain("paychecks-add");
    expect(targetIds).toContain("bills-due");
    expect(targetIds).toContain("purchases-filters");
    expect(targetIds).toContain("settings-money");
    expect(targetIds).toContain("settings-preferences");
  });
});
