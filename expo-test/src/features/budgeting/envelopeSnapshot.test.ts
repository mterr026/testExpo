import { describe, expect, it } from "vitest";

import type { Envelope, Paycheck, Purchase } from "@/database/repositories/types";
import { OPEN_ENDED_PAYCHECK_CYCLE_DATE } from "@/engine";

import { buildEnvelopeSnapshot } from "./envelopeSnapshot";

const profileId = "profile-1";

const receivedPaycheck: Paycheck = {
  id: "paycheck-1",
  profileId,
  label: "Primary",
  amountCents: 200000,
  expectedDate: "2026-06-01",
  isReceived: true,
  receivedAt: "2026-06-01T12:00:00.000Z",
  isRecurring: true,
  recurrenceInterval: "biweekly",
  isPrimary: true,
  notes: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const envelope: Envelope = {
  id: "envelope-1",
  profileId,
  name: "Groceries",
  allocationCents: 20000,
  sortOrder: 0,
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

describe("buildEnvelopeSnapshot", () => {
  it("counts_purchase_spent_after_recurrence_boundary_when_active_cycle_is_open_ended", () => {
    const purchase: Purchase = {
      id: "purchase-1",
      profileId,
      amountCents: 2500,
      state: "charged",
      description: "Groceries",
      purchaseDate: "2026-07-04",
      paycheckCycleId: "paycheck-1",
      envelopeId: "envelope-1",
      resolvedAt: "2026-07-04T12:00:00.000Z",
      createdAt: "2026-07-04T12:00:00.000Z",
      updatedAt: "2026-07-04T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    };

    const snapshot = buildEnvelopeSnapshot({
      envelopes: [envelope],
      purchases: [purchase],
      paychecks: [receivedPaycheck],
      activeCyclePaycheckId: "paycheck-1",
      activeCycleStartDate: "2026-06-01",
      activeCycleEndDate: OPEN_ENDED_PAYCHECK_CYCLE_DATE,
      envelopesEnabled: true,
    });

    expect(snapshot.entries).toEqual([
      {
        envelopeId: "envelope-1",
        allocatedCents: 20000,
        spentCents: 2500,
        remainingCents: 17500,
        reservedCents: 17500,
      },
    ]);
  });

  it("counts_all_envelope_purchases_when_no_active_cycle", () => {
    const purchase: Purchase = {
      id: "purchase-1",
      profileId,
      amountCents: 1500,
      state: "charged",
      description: "Coffee",
      purchaseDate: "2026-07-04",
      paycheckCycleId: null,
      envelopeId: "envelope-1",
      resolvedAt: "2026-07-04T12:00:00.000Z",
      createdAt: "2026-07-04T12:00:00.000Z",
      updatedAt: "2026-07-04T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    };

    const snapshot = buildEnvelopeSnapshot({
      envelopes: [envelope],
      purchases: [purchase],
      paychecks: [],
      activeCyclePaycheckId: null,
      activeCycleStartDate: null,
      activeCycleEndDate: null,
      envelopesEnabled: true,
    });

    expect(snapshot.entries[0]?.spentCents).toBe(1500);
  });
});
