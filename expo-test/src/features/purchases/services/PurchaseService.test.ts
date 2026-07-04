import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActivityLogRepository,
  PaycheckRepository,
  PurchaseRepository,
} from "@/database/repositories";
import type { Paycheck, Purchase } from "@/database/repositories/types";
import { FINANCIAL_STATE_CHANGED } from "@/shared/events/financialEvents";

import { PurchaseService } from "./PurchaseService";

const receivedPaycheck: Paycheck = {
  id: "paycheck-1",
  profileId: "profile-1",
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

const purchase: Purchase = {
  id: "purchase-1",
  profileId: "profile-1",
  amountCents: 1234,
  state: "pending",
  description: "Coffee",
  purchaseDate: "2026-06-01",
  paycheckCycleId: "paycheck-1",
  envelopeId: null,
  resolvedAt: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

function createMocks() {
  return {
    purchaseRepository: {
      create: vi.fn(),
      update: vi.fn(),
      markCharged: vi.fn(),
      markPending: vi.fn(),
      findById: vi.fn(),
      softDelete: vi.fn(),
    },
    paycheckRepository: {
      findAll: vi.fn(),
    },
    activityLogRepository: {
      create: vi.fn(),
    },
    eventBus: {
      emit: vi.fn(),
    },
  };
}

function createService(mocks: ReturnType<typeof createMocks>) {
  return new PurchaseService(
    mocks.purchaseRepository as unknown as PurchaseRepository,
    mocks.paycheckRepository as unknown as PaycheckRepository,
    mocks.activityLogRepository as unknown as ActivityLogRepository,
    mocks.eventBus
  );
}

describe("PurchaseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPurchase_assigns_active_paycheck_cycle_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.paycheckRepository.findAll.mockResolvedValue([receivedPaycheck]);
    mocks.purchaseRepository.create.mockResolvedValue(purchase);
    const service = createService(mocks);

    const created = await service.createPurchase({
      profileId: "profile-1",
      amountCents: 1234,
      state: "pending",
      description: "Coffee",
      purchaseDate: "2026-06-10",
    });

    expect(created).toBe(purchase);
    expect(mocks.paycheckRepository.findAll).toHaveBeenCalledWith("profile-1");
    expect(mocks.purchaseRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      amountCents: 1234,
      state: "pending",
      description: "Coffee",
      purchaseDate: "2026-06-10",
      paycheckCycleId: "paycheck-1",
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "purchase_added",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: "Added purchase: $12.34",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("createPurchase_allows_missing_cycle", async () => {
    const mocks = createMocks();
    mocks.paycheckRepository.findAll.mockResolvedValue([]);
    mocks.purchaseRepository.create.mockResolvedValue({
      ...purchase,
      paycheckCycleId: null,
    });
    const service = createService(mocks);

    await service.createPurchase({
      profileId: "profile-1",
      amountCents: 1234,
      purchaseDate: "2026-06-01",
    });

    expect(mocks.purchaseRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      amountCents: 1234,
      purchaseDate: "2026-06-01",
      paycheckCycleId: null,
    });
  });

  it("updatePurchase_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.purchaseRepository.findById.mockResolvedValue(purchase);
    mocks.purchaseRepository.update.mockResolvedValue({
      ...purchase,
      amountCents: 2000,
    });
    const service = createService(mocks);

    await service.updatePurchase("purchase-1", {
      amountCents: 2000,
      state: "charged",
    });

    expect(mocks.purchaseRepository.update).toHaveBeenCalledWith("purchase-1", {
      amountCents: 2000,
      state: "charged",
      resolvedAt: expect.any(String),
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "purchase_updated",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: "Updated purchase: $20.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markPurchaseCharged_logs_state_change_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.purchaseRepository.markCharged.mockResolvedValue({
      ...purchase,
      state: "charged",
      resolvedAt: "2026-06-01T12:00:00.000Z",
    });
    const service = createService(mocks);

    await service.markPurchaseCharged("purchase-1");

    expect(mocks.purchaseRepository.markCharged).toHaveBeenCalledWith(
      "purchase-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "purchase_state_changed",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: "Marked purchase charged: $12.34",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markPurchasePending_logs_state_change_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.purchaseRepository.markPending.mockResolvedValue({
      ...purchase,
      state: "pending",
    });
    const service = createService(mocks);

    await service.markPurchasePending("purchase-1");

    expect(mocks.purchaseRepository.markPending).toHaveBeenCalledWith(
      "purchase-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "purchase_state_changed",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: "Marked purchase pending: $12.34",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("deletePurchase_soft_deletes_existing_purchase_logs_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.purchaseRepository.findById.mockResolvedValue(purchase);
    const service = createService(mocks);

    await service.deletePurchase("purchase-1");

    expect(mocks.purchaseRepository.findById).toHaveBeenCalledWith("purchase-1");
    expect(mocks.purchaseRepository.softDelete).toHaveBeenCalledWith(
      "purchase-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "purchase_deleted",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: "Deleted purchase: $12.34",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("deletePurchase_rejects_missing_purchase_without_side_effects", async () => {
    const mocks = createMocks();
    mocks.purchaseRepository.findById.mockResolvedValue(null);
    const service = createService(mocks);

    await expect(service.deletePurchase("missing")).rejects.toThrow(
      "Purchase missing not found."
    );
    expect(mocks.purchaseRepository.softDelete).not.toHaveBeenCalled();
    expect(mocks.activityLogRepository.create).not.toHaveBeenCalled();
    expect(mocks.eventBus.emit).not.toHaveBeenCalled();
  });
});
