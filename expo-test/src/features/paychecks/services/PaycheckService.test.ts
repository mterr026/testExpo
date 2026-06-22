import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActivityLogRepository,
  PaycheckRepository,
} from "@/database/repositories";
import type { Paycheck } from "@/database/repositories/types";
import { FINANCIAL_STATE_CHANGED } from "@/shared/events/financialEvents";

import { PaycheckService } from "./PaycheckService";

const paycheck: Paycheck = {
  id: "paycheck-1",
  profileId: "profile-1",
  label: "Primary",
  amountCents: 200000,
  expectedDate: "2026-06-01",
  isReceived: false,
  receivedAt: null,
  isRecurring: true,
  recurrenceInterval: "biweekly",
  isPrimary: true,
  notes: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

function createMocks() {
  return {
    paycheckRepository: {
      create: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      markReceived: vi.fn(),
      markUnreceived: vi.fn(),
      findById: vi.fn(),
      softDelete: vi.fn(),
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
  return new PaycheckService(
    mocks.paycheckRepository as unknown as PaycheckRepository,
    mocks.activityLogRepository as unknown as ActivityLogRepository,
    mocks.eventBus
  );
}

describe("PaycheckService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPaycheck_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.paycheckRepository.create.mockResolvedValue(paycheck);
    const service = createService(mocks);

    const created = await service.createPaycheck({
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-06-01",
      isRecurring: true,
      recurrenceInterval: "biweekly",
    });

    expect(created).toBe(paycheck);
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "paycheck_added",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Added paycheck series: $2,000.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("createPaycheck_generates_future_expected_paychecks_for_recurring_income", async () => {
    const mocks = createMocks();
    const generatedPaychecks = [
      { ...paycheck, id: "paycheck-2", expectedDate: "2026-06-15" },
    ];

    mocks.paycheckRepository.create
      .mockResolvedValueOnce(paycheck)
      .mockResolvedValueOnce(generatedPaychecks[0]);
    const service = createService(mocks);

    await service.createPaycheck({
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-06-01",
      isRecurring: true,
      recurrenceInterval: "biweekly",
    });

    expect(mocks.paycheckRepository.create).toHaveBeenCalledTimes(2);
    expect(mocks.paycheckRepository.create).toHaveBeenNthCalledWith(2, {
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-06-15",
      isPrimary: true,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: "biweekly",
      notes: undefined,
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledTimes(1);
  });

  it("createPaycheck_does_not_generate_future_paychecks_for_one_time_income", async () => {
    const oneTimePaycheck = {
      ...paycheck,
      isRecurring: false,
      recurrenceInterval: null,
    };
    const mocks = createMocks();

    mocks.paycheckRepository.create.mockResolvedValue(oneTimePaycheck);
    const service = createService(mocks);

    await service.createPaycheck({
      profileId: "profile-1",
      label: "Side work",
      amountCents: 75000,
      expectedDate: "2026-06-03",
      isRecurring: false,
      recurrenceInterval: null,
    });

    expect(mocks.paycheckRepository.create).toHaveBeenCalledTimes(1);
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "paycheck_added",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Added paycheck: $2,000.00",
    });
  });

  it("updatePaycheck_logs_adjustment_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.paycheckRepository.update.mockResolvedValue({
      ...paycheck,
      amountCents: 210000,
    });
    const service = createService(mocks);

    await service.updatePaycheck("paycheck-1", { amountCents: 210000 });

    expect(mocks.paycheckRepository.update).toHaveBeenCalledWith("paycheck-1", {
      amountCents: 210000,
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "paycheck_adjusted",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Updated paycheck: $2,100.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markPaycheckReceived_logs_confirmation_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.paycheckRepository.markReceived.mockResolvedValue({
      ...paycheck,
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
    });
    mocks.paycheckRepository.findAll.mockResolvedValue([
      paycheck,
      { ...paycheck, id: "paycheck-2", expectedDate: "2026-06-15" },
      { ...paycheck, id: "paycheck-3", expectedDate: "2026-06-29" },
    ]);
    mocks.paycheckRepository.create.mockResolvedValue({
      ...paycheck,
      id: "paycheck-4",
      expectedDate: "2026-07-13",
    });
    const service = createService(mocks);

    await service.markPaycheckReceived("paycheck-1");

    expect(mocks.paycheckRepository.markReceived).toHaveBeenCalledWith(
      "paycheck-1"
    );
    expect(mocks.paycheckRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-07-13",
      isPrimary: true,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: "biweekly",
      notes: null,
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "paycheck_confirmed",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Confirmed paycheck: $2,000.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markPaycheckReceived_creates_the_next_monthly_paycheck_after_the_latest_expected_date", async () => {
    const monthlyPaycheck: Paycheck = {
      ...paycheck,
      id: "monthly-1",
      expectedDate: "2026-06-20",
      recurrenceInterval: "monthly",
    };
    const nextMonthlyPaycheck: Paycheck = {
      ...monthlyPaycheck,
      id: "monthly-2",
      expectedDate: "2026-07-20",
      isReceived: false,
      receivedAt: null,
    };
    const mocks = createMocks();

    mocks.paycheckRepository.markReceived.mockResolvedValue({
      ...monthlyPaycheck,
      isReceived: true,
      receivedAt: "2026-06-20T12:00:00.000Z",
    });
    mocks.paycheckRepository.findAll.mockResolvedValue([
      { ...monthlyPaycheck, isReceived: true },
      nextMonthlyPaycheck,
    ]);
    mocks.paycheckRepository.create.mockResolvedValue({
      ...monthlyPaycheck,
      id: "monthly-3",
      expectedDate: "2026-08-20",
      isReceived: false,
      receivedAt: null,
    });
    const service = createService(mocks);

    await service.markPaycheckReceived("monthly-1");

    expect(mocks.paycheckRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-08-20",
      isPrimary: true,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: "monthly",
      notes: null,
    });
  });

  it("markPaycheckReceived_preserves_secondary_income_when_generating_next_recurring_paycheck", async () => {
    const pensionPaycheck: Paycheck = {
      ...paycheck,
      id: "pension-1",
      label: "Pension",
      expectedDate: "2026-06-01",
      isPrimary: false,
      recurrenceInterval: "monthly",
    };
    const mocks = createMocks();

    mocks.paycheckRepository.markReceived.mockResolvedValue({
      ...pensionPaycheck,
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
    });
    mocks.paycheckRepository.findAll.mockResolvedValue([
      { ...pensionPaycheck, isReceived: true },
    ]);
    mocks.paycheckRepository.create.mockResolvedValue({
      ...pensionPaycheck,
      id: "pension-2",
      expectedDate: "2026-07-01",
      isReceived: false,
      receivedAt: null,
    });
    const service = createService(mocks);

    await service.markPaycheckReceived("pension-1");

    expect(mocks.paycheckRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      label: "Pension",
      amountCents: 200000,
      expectedDate: "2026-07-01",
      isPrimary: false,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: "monthly",
      notes: null,
    });
  });

  it("createPaycheck_preserves_secondary_income_for_generated_recurring_paychecks", async () => {
    const mocks = createMocks();
    const secondaryPaycheck = {
      ...paycheck,
      id: "pension-1",
      label: "Pension",
      isPrimary: false,
      recurrenceInterval: "monthly" as const,
    };
    const generatedPaycheck = {
      ...secondaryPaycheck,
      id: "pension-2",
      expectedDate: "2026-07-01",
    };

    mocks.paycheckRepository.create
      .mockResolvedValueOnce(secondaryPaycheck)
      .mockResolvedValueOnce(generatedPaycheck);
    const service = createService(mocks);

    await service.createPaycheck({
      profileId: "profile-1",
      label: "Pension",
      amountCents: 200000,
      expectedDate: "2026-06-01",
      isPrimary: false,
      isRecurring: true,
      recurrenceInterval: "monthly",
    });

    expect(mocks.paycheckRepository.create).toHaveBeenNthCalledWith(2, {
      profileId: "profile-1",
      label: "Pension",
      amountCents: 200000,
      expectedDate: "2026-07-01",
      isPrimary: false,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: "monthly",
      notes: undefined,
    });
  });

  it("markPaycheckUnreceived_moves_previous_paycheck_back_to_expected", async () => {
    const mocks = createMocks();

    mocks.paycheckRepository.findById.mockResolvedValue({
      ...paycheck,
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
    });
    mocks.paycheckRepository.markUnreceived.mockResolvedValue({
      ...paycheck,
      isReceived: false,
      receivedAt: null,
    });
    const service = createService(mocks);

    await service.markPaycheckUnreceived("paycheck-1");

    expect(mocks.paycheckRepository.markUnreceived).toHaveBeenCalledWith(
      "paycheck-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "paycheck_adjusted",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Marked paycheck expected: $2,000.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markPaycheckUnreceived_removes_extra_generated_future_paycheck", async () => {
    const firstFuturePaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
      createdAt: "2026-05-01T12:00:00.000Z",
    };
    const generatedAfterReceivedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-3",
      expectedDate: "2026-06-29",
      isReceived: false,
      receivedAt: null,
    };
    const mocks = createMocks();

    mocks.paycheckRepository.findById.mockResolvedValue({
      ...paycheck,
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
    });
    mocks.paycheckRepository.markUnreceived.mockResolvedValue({
      ...paycheck,
      isReceived: false,
      receivedAt: null,
    });
    mocks.paycheckRepository.findAll.mockResolvedValue([
      { ...paycheck, isReceived: false, receivedAt: null },
      firstFuturePaycheck,
      generatedAfterReceivedPaycheck,
    ]);
    const service = createService(mocks);

    await service.markPaycheckUnreceived("paycheck-1");

    expect(mocks.paycheckRepository.softDelete).toHaveBeenCalledTimes(1);
    expect(mocks.paycheckRepository.softDelete).toHaveBeenCalledWith(
      "paycheck-3"
    );
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markPaycheckUnreceived_keeps_the_single_next_expected_paycheck", async () => {
    const firstFuturePaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
      createdAt: "2026-05-01T12:00:00.000Z",
    };
    const mocks = createMocks();

    mocks.paycheckRepository.findById.mockResolvedValue({
      ...paycheck,
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
    });
    mocks.paycheckRepository.markUnreceived.mockResolvedValue({
      ...paycheck,
      isReceived: false,
      receivedAt: null,
    });
    mocks.paycheckRepository.findAll.mockResolvedValue([
      { ...paycheck, isReceived: false, receivedAt: null },
      firstFuturePaycheck,
    ]);
    const service = createService(mocks);

    await service.markPaycheckUnreceived("paycheck-1");

    expect(mocks.paycheckRepository.softDelete).not.toHaveBeenCalled();
  });

  it("markPaycheckUnreceived_removes_single_future_paycheck_created_after_receive", async () => {
    const generatedAfterReceivedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
      createdAt: "2026-06-01T12:00:01.000Z",
    };
    const mocks = createMocks();

    mocks.paycheckRepository.findById.mockResolvedValue({
      ...paycheck,
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
    });
    mocks.paycheckRepository.markUnreceived.mockResolvedValue({
      ...paycheck,
      isReceived: false,
      receivedAt: null,
    });
    mocks.paycheckRepository.findAll.mockResolvedValue([
      { ...paycheck, isReceived: false, receivedAt: null },
      generatedAfterReceivedPaycheck,
    ]);
    const service = createService(mocks);

    await service.markPaycheckUnreceived("paycheck-1");

    expect(mocks.paycheckRepository.softDelete).toHaveBeenCalledTimes(1);
    expect(mocks.paycheckRepository.softDelete).toHaveBeenCalledWith(
      "paycheck-2"
    );
  });

  it("markPaycheckReceived_confirms_multiple_income_sources_independently", async () => {
    const secondaryPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      label: "Side work",
      amountCents: 65000,
      expectedDate: "2026-06-03",
    };
    const mocks = createMocks();

    mocks.paycheckRepository.markReceived
      .mockResolvedValueOnce({
        ...paycheck,
        isReceived: true,
        receivedAt: "2026-06-01T12:00:00.000Z",
      })
      .mockResolvedValueOnce({
        ...secondaryPaycheck,
        isReceived: true,
        receivedAt: "2026-06-03T12:00:00.000Z",
      });
    mocks.paycheckRepository.findAll.mockResolvedValue([]);
    const service = createService(mocks);

    await service.markPaycheckReceived("paycheck-1");
    await service.markPaycheckReceived("paycheck-2");

    expect(mocks.paycheckRepository.markReceived).toHaveBeenNthCalledWith(
      1,
      "paycheck-1"
    );
    expect(mocks.paycheckRepository.markReceived).toHaveBeenNthCalledWith(
      2,
      "paycheck-2"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenNthCalledWith(1, {
      profileId: "profile-1",
      eventType: "paycheck_confirmed",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Confirmed paycheck: $2,000.00",
    });
    expect(mocks.activityLogRepository.create).toHaveBeenNthCalledWith(2, {
      profileId: "profile-1",
      eventType: "paycheck_confirmed",
      entityType: "paycheck",
      entityId: "paycheck-2",
      summary: "Confirmed paycheck: $650.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenNthCalledWith(
      1,
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
    expect(mocks.eventBus.emit).toHaveBeenNthCalledWith(
      2,
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("deletePaycheck_soft_deletes_existing_paycheck_logs_and_emits_change", async () => {
    const mocks = createMocks();
    const oneTimePaycheck = {
      ...paycheck,
      isRecurring: false,
      recurrenceInterval: null,
    };
    mocks.paycheckRepository.findById.mockResolvedValue(oneTimePaycheck);
    const service = createService(mocks);

    await service.deletePaycheck("paycheck-1");

    expect(mocks.paycheckRepository.findById).toHaveBeenCalledWith("paycheck-1");
    expect(mocks.paycheckRepository.softDelete).toHaveBeenCalledWith(
      "paycheck-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "paycheck_deleted",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Deleted paycheck: $2,000.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("deletePaycheck_deletes_selected_recurring_paycheck_and_future_expected_series", async () => {
    const mocks = createMocks();
    const pastReceived = {
      ...paycheck,
      id: "paycheck-0",
      expectedDate: "2026-05-18",
      isReceived: true,
      receivedAt: "2026-05-18T12:00:00.000Z",
    };
    const futureExpected = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
    };
    const laterExpected = {
      ...paycheck,
      id: "paycheck-3",
      expectedDate: "2026-06-29",
    };
    const unrelatedPaycheck = {
      ...paycheck,
      id: "paycheck-side",
      label: "Side work",
      expectedDate: "2026-06-15",
    };

    mocks.paycheckRepository.findById.mockResolvedValue(paycheck);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      pastReceived,
      paycheck,
      futureExpected,
      laterExpected,
      unrelatedPaycheck,
    ]);
    const service = createService(mocks);

    await service.deletePaycheck("paycheck-1");

    expect(mocks.paycheckRepository.findAll).toHaveBeenCalledWith("profile-1");
    expect(mocks.paycheckRepository.softDelete).toHaveBeenCalledTimes(3);
    expect(mocks.paycheckRepository.softDelete).toHaveBeenNthCalledWith(
      1,
      "paycheck-1"
    );
    expect(mocks.paycheckRepository.softDelete).toHaveBeenNthCalledWith(
      2,
      "paycheck-2"
    );
    expect(mocks.paycheckRepository.softDelete).toHaveBeenNthCalledWith(
      3,
      "paycheck-3"
    );
    expect(mocks.paycheckRepository.softDelete).not.toHaveBeenCalledWith(
      "paycheck-0"
    );
    expect(mocks.paycheckRepository.softDelete).not.toHaveBeenCalledWith(
      "paycheck-side"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "paycheck_deleted",
      entityType: "paycheck",
      entityId: "paycheck-1",
      summary: "Deleted paycheck series: $2,000.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("deletePaycheck_rejects_missing_paycheck_without_side_effects", async () => {
    const mocks = createMocks();
    mocks.paycheckRepository.findById.mockResolvedValue(null);
    const service = createService(mocks);

    await expect(service.deletePaycheck("missing")).rejects.toThrow(
      "Paycheck missing not found."
    );
    expect(mocks.paycheckRepository.softDelete).not.toHaveBeenCalled();
    expect(mocks.activityLogRepository.create).not.toHaveBeenCalled();
    expect(mocks.eventBus.emit).not.toHaveBeenCalled();
  });

  it("findCycleForDate_uses_recurrence_boundary_for_recurring_anchor", async () => {
    const mocks = createMocks();
    mocks.paycheckRepository.findAll.mockResolvedValue([
      {
        ...paycheck,
        id: "paycheck-1",
        expectedDate: "2026-06-01",
        recurrenceInterval: "biweekly",
      },
    ]);
    const service = createService(mocks);

    await expect(service.findCycleForDate("profile-1", "2026-06-10")).resolves.toEqual({
      cycleAnchor: expect.objectContaining({
        id: "paycheck-1",
        expectedDate: "2026-06-01",
      }),
      nextCycleAnchor: null,
    });
  });
});
