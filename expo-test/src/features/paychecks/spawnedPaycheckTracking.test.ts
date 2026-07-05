import { describe, expect, it } from "vitest";

import {
  readSpawnedNextPaycheckId,
  stripSpawnedNextPaycheckId,
  withSpawnedNextPaycheckId,
} from "./spawnedPaycheckTracking";

describe("spawnedPaycheckTracking", () => {
  it("stores_and_reads_a_spawned_paycheck_id", () => {
    const notes = withSpawnedNextPaycheckId("Side gig deposit", "paycheck-2");

    expect(readSpawnedNextPaycheckId(notes)).toBe("paycheck-2");
    expect(stripSpawnedNextPaycheckId(notes)).toBe("Side gig deposit");
  });

  it("clears_the_spawned_marker_without_touching_user_notes", () => {
    const notes = withSpawnedNextPaycheckId("Side gig deposit", "paycheck-2");

    expect(withSpawnedNextPaycheckId(notes, null)).toBe("Side gig deposit");
  });
});
