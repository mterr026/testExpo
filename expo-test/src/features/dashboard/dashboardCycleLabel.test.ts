import { describe, expect, it } from "vitest";

import { formatDashboardCycleLabel } from "./dashboardCycleLabel";

describe("formatDashboardCycleLabel", () => {
  it("formats_a_closed_cycle_window", () => {
    expect(formatDashboardCycleLabel("2026-06-01", "2026-06-15")).toBe(
      "Jun 1 – Jun 15"
    );
  });

  it("formats_an_open_ended_cycle_window", () => {
    expect(formatDashboardCycleLabel("2026-06-01", "9999-12-31")).toBe(
      "Jun 1 onward"
    );
  });

  it("returns_a_fallback_when_no_cycle_is_active", () => {
    expect(formatDashboardCycleLabel(null, null)).toBe("No active cycle");
  });
});
