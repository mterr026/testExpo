import { describe, expect, it } from "vitest";

import { addDaysToIsoDate } from "./demoSeedDates";

describe("demoSeedDates", () => {
  it("adds_days_to_an_iso_date", () => {
    expect(addDaysToIsoDate("2026-06-01", 5)).toBe("2026-06-06");
    expect(addDaysToIsoDate("2026-06-01", -1)).toBe("2026-05-31");
  });
});
