import { describe, expect, it } from "vitest";

import type { PaycheckListItem } from "@/shared/ui/types";

import {
  getAdditionalPaychecks,
  getPrimaryPaychecks,
  splitPaycheckSchedule,
} from "./paycheckSchedule";

function paycheck(
  overrides: Partial<PaycheckListItem> = {}
): PaycheckListItem {
  return {
    id: "paycheck-1",
    label: "Primary",
    amountCents: 200000,
    expectedDate: "2026-06-20",
    isReceived: false,
    isPrimary: true,
    recurrenceInterval: null,
    ...overrides,
  };
}

describe("splitPaycheckSchedule", () => {
  it("moves_received_paychecks_out_of_expected_and_into_previous", () => {
    const received = paycheck({
      id: "received",
      expectedDate: "2026-06-20",
      isReceived: true,
    });
    const expected = paycheck({
      id: "expected",
      expectedDate: "2026-07-04",
    });

    expect(splitPaycheckSchedule([received, expected])).toEqual({
      expectedPaychecks: [expected],
      previousPaychecks: [received],
    });
  });

  it("sorts_expected_ascending_and_previous_descending", () => {
    const schedule = splitPaycheckSchedule([
      paycheck({ id: "expected-later", expectedDate: "2026-07-18" }),
      paycheck({ id: "previous-earlier", expectedDate: "2026-06-06", isReceived: true }),
      paycheck({ id: "expected-sooner", expectedDate: "2026-07-04" }),
      paycheck({ id: "previous-later", expectedDate: "2026-06-20", isReceived: true }),
    ]);

    expect(schedule.expectedPaychecks.map((candidate) => candidate.id)).toEqual([
      "expected-sooner",
      "expected-later",
    ]);
    expect(schedule.previousPaychecks.map((candidate) => candidate.id)).toEqual([
      "previous-later",
      "previous-earlier",
    ]);
  });
});

describe("getPrimaryPaychecks", () => {
  it("returns_primary_paychecks_when_any_are_marked_primary", () => {
    const paychecks = [
      paycheck({ id: "primary", isPrimary: true }),
      paycheck({ id: "additional", isPrimary: false }),
    ];

    expect(getPrimaryPaychecks(paychecks).map((item) => item.id)).toEqual([
      "primary",
    ]);
  });

  it("falls_back_to_all_paychecks_when_none_are_primary", () => {
    const paychecks = [
      paycheck({ id: "first", isPrimary: false }),
      paycheck({ id: "second", isPrimary: false }),
    ];

    expect(getPrimaryPaychecks(paychecks).map((item) => item.id)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("getAdditionalPaychecks", () => {
  it("returns_non_primary_paychecks_when_primary_exists", () => {
    const paychecks = [
      paycheck({ id: "primary", isPrimary: true }),
      paycheck({ id: "additional-1", isPrimary: false }),
      paycheck({ id: "additional-2", isPrimary: false }),
    ];

    expect(getAdditionalPaychecks(paychecks).map((item) => item.id)).toEqual([
      "additional-1",
      "additional-2",
    ]);
  });

  it("returns_empty_when_no_primary_paycheck_exists", () => {
    const paychecks = [
      paycheck({ id: "first", isPrimary: false }),
      paycheck({ id: "second", isPrimary: false }),
    ];

    expect(getAdditionalPaychecks(paychecks)).toEqual([]);
  });
});
