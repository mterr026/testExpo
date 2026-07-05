import { describe, expect, it } from "vitest";

import { computeEnvelopeSnapshot } from "./envelopes";

describe("envelope snapshot engine", () => {
  it("returns_empty_snapshot_when_envelopes_disabled", () => {
    expect(
      computeEnvelopeSnapshot({
        envelopes: [
          {
            id: "envelope-1",
            allocationCents: 10000,
            isPaused: false,
          },
        ],
        purchases: [
          {
            amountCents: 2500,
            state: "charged",
            envelopeId: "envelope-1",
            paycheckCycleId: "cycle-1",
          },
        ],
        activeCyclePaycheckId: "cycle-1",
        envelopesEnabled: false,
      })
    ).toEqual({
      envelopesEnabled: false,
      activeCyclePaycheckId: "cycle-1",
      entries: [],
      totalReservedCents: 0,
    });
  });

  it("computes_per_envelope_spent_remaining_and_reserved_for_active_cycle", () => {
    expect(
      computeEnvelopeSnapshot({
        envelopes: [
          {
            id: "groceries",
            allocationCents: 20000,
            isPaused: false,
          },
          {
            id: "dining",
            allocationCents: 10000,
            isPaused: false,
          },
        ],
        purchases: [
          {
            amountCents: 7500,
            state: "charged",
            envelopeId: "groceries",
            paycheckCycleId: "cycle-1",
          },
          {
            amountCents: 1500,
            state: "pending",
            envelopeId: "groceries",
            paycheckCycleId: "cycle-1",
          },
          {
            amountCents: 4000,
            state: "charged",
            envelopeId: "dining",
            paycheckCycleId: "cycle-1",
          },
          {
            amountCents: 5000,
            state: "charged",
            envelopeId: "groceries",
            paycheckCycleId: "cycle-0",
          },
          {
            amountCents: 3000,
            state: "charged",
            envelopeId: null,
            paycheckCycleId: "cycle-1",
          },
        ],
        activeCyclePaycheckId: "cycle-1",
        envelopesEnabled: true,
      })
    ).toEqual({
      envelopesEnabled: true,
      activeCyclePaycheckId: "cycle-1",
      entries: [
        {
          envelopeId: "groceries",
          allocatedCents: 20000,
          spentCents: 9000,
          remainingCents: 11000,
          reservedCents: 11000,
        },
        {
          envelopeId: "dining",
          allocatedCents: 10000,
          spentCents: 4000,
          remainingCents: 6000,
          reservedCents: 6000,
        },
      ],
      totalReservedCents: 17000,
    });
  });

  it("allows_negative_remaining_and_zero_reserved_on_overspend", () => {
    expect(
      computeEnvelopeSnapshot({
        envelopes: [
          {
            id: "fun",
            allocationCents: 5000,
            isPaused: false,
          },
        ],
        purchases: [
          {
            amountCents: 8000,
            state: "charged",
            envelopeId: "fun",
            paycheckCycleId: "cycle-1",
          },
        ],
        activeCyclePaycheckId: "cycle-1",
        envelopesEnabled: true,
      }).entries[0]
    ).toEqual({
      envelopeId: "fun",
      allocatedCents: 5000,
      spentCents: 8000,
      remainingCents: -3000,
      reservedCents: 0,
    });
  });

  it("excludes_paused_deleted_and_other_cycle_purchases", () => {
    const snapshot = computeEnvelopeSnapshot({
      envelopes: [
        {
          id: "active",
          allocationCents: 10000,
          isPaused: false,
        },
        {
          id: "paused",
          allocationCents: 10000,
          isPaused: true,
        },
        {
          id: "deleted",
          allocationCents: 10000,
          isPaused: false,
          deletedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      purchases: [
        {
          amountCents: 1000,
          state: "charged",
          envelopeId: "active",
          paycheckCycleId: "cycle-1",
        },
        {
          amountCents: 2000,
          state: "charged",
          envelopeId: "paused",
          paycheckCycleId: "cycle-1",
        },
        {
          amountCents: 3000,
          state: "charged",
          envelopeId: "active",
          paycheckCycleId: "cycle-1",
          deletedAt: "2026-06-02T00:00:00.000Z",
        },
      ],
      activeCyclePaycheckId: "cycle-1",
      envelopesEnabled: true,
    });

    expect(snapshot.entries).toEqual([
      {
        envelopeId: "active",
        allocatedCents: 10000,
        spentCents: 1000,
        remainingCents: 9000,
        reservedCents: 9000,
      },
    ]);
    expect(snapshot.totalReservedCents).toBe(9000);
  });

  it("returns_zero_spent_when_no_active_cycle", () => {
    expect(
      computeEnvelopeSnapshot({
        envelopes: [
          {
            id: "groceries",
            allocationCents: 15000,
            isPaused: false,
          },
        ],
        purchases: [
          {
            amountCents: 4000,
            state: "charged",
            envelopeId: "groceries",
            paycheckCycleId: "cycle-1",
          },
        ],
        activeCyclePaycheckId: null,
        envelopesEnabled: true,
      })
    ).toEqual({
      envelopesEnabled: true,
      activeCyclePaycheckId: null,
      entries: [
        {
          envelopeId: "groceries",
          allocatedCents: 15000,
          spentCents: 0,
          remainingCents: 15000,
          reservedCents: 15000,
        },
      ],
      totalReservedCents: 15000,
    });
  });

  it("counts_envelope_spent_by_active_cycle_date_when_stored_cycle_id_differs", () => {
    expect(
      computeEnvelopeSnapshot({
        envelopes: [
          {
            id: "gas",
            allocationCents: 20000,
            isPaused: false,
          },
        ],
        purchases: [
          {
            amountCents: 4500,
            state: "charged",
            envelopeId: "gas",
            paycheckCycleId: "stale-cycle-id",
            purchaseDate: "2026-06-10",
          },
        ],
        activeCyclePaycheckId: "paycheck-1",
        activeCycleStartDate: "2026-06-01",
        activeCycleEndDate: "2026-06-15",
        envelopesEnabled: true,
      })
    ).toEqual({
      envelopesEnabled: true,
      activeCyclePaycheckId: "paycheck-1",
      entries: [
        {
          envelopeId: "gas",
          allocatedCents: 20000,
          spentCents: 4500,
          remainingCents: 15500,
          reservedCents: 15500,
        },
      ],
      totalReservedCents: 15500,
    });
  });
});
