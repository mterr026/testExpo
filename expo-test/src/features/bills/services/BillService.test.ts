import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActivityLogRepository,
  BillCycleInstanceRepository,
  BillRepository,
} from "@/database/repositories";
import type { Bill, BillCycleInstance } from "@/database/repositories/types";
import { FINANCIAL_STATE_CHANGED } from "@/shared/events/financialEvents";

import { BillService } from "./BillService";

const bill: Bill = {
  id: "bill-1",
  profileId: "profile-1",
  name: "Rent",
  billType: "fixed",
  defaultAmountCents: 150000,
  recurrenceInterval: "monthly",
  customIntervalDays: null,
  dueDayOfCycle: 1,
  dueDateAbsolute: null,
  endDate: null,
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const instance: BillCycleInstance = {
  id: "instance-1",
  billId: "bill-1",
  paycheckCycleId: "paycheck-1",
  cycleAmountCents: 150000,
  isVariableConfirmed: false,
  isPaid: false,
  paidAt: null,
  dueDate: "2026-06-01",
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

function createMocks() {
  return {
    billRepository: {
      create: vi.fn(),
      update: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      findById: vi.fn(),
      softDelete: vi.fn(),
    },
    billCycleInstanceRepository: {
      findByCycle: vi.fn(),
      findExisting: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      markPaid: vi.fn(),
      markUnpaid: vi.fn(),
      confirmVariableAmount: vi.fn(),
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
  return new BillService(
    mocks.billRepository as unknown as BillRepository,
    mocks.billCycleInstanceRepository as unknown as BillCycleInstanceRepository,
    mocks.activityLogRepository as unknown as ActivityLogRepository,
    mocks.eventBus
  );
}

describe("BillService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createBill_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.billRepository.create.mockResolvedValue(bill);
    const service = createService(mocks);

    const created = await service.createBill({
      profileId: "profile-1",
      name: "Rent",
      billType: "fixed",
      defaultAmountCents: 150000,
      recurrenceInterval: "monthly",
      dueDayOfCycle: 1,
    });

    expect(created).toBe(bill);
    expect(mocks.billRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      name: "Rent",
      billType: "fixed",
      defaultAmountCents: 150000,
      recurrenceInterval: "monthly",
      dueDayOfCycle: 1,
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_added",
      entityType: "bill",
      entityId: "bill-1",
      summary: "Added bill: Rent",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("updateBill_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.billRepository.update.mockResolvedValue({ ...bill, name: "Mortgage" });
    const service = createService(mocks);

    await service.updateBill("bill-1", { name: "Mortgage" });

    expect(mocks.billRepository.update).toHaveBeenCalledWith("bill-1", {
      name: "Mortgage",
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_updated",
      entityType: "bill",
      entityId: "bill-1",
      summary: "Updated bill: Mortgage",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("updateBillForCycle_updates_parent_and_visible_instance", async () => {
    const mocks = createMocks();
    mocks.billRepository.update.mockResolvedValue({
      ...bill,
      defaultAmountCents: 160000,
      dueDateAbsolute: "2026-06-05",
    });
    mocks.billCycleInstanceRepository.update.mockResolvedValue({
      ...instance,
      cycleAmountCents: 160000,
      dueDate: "2026-06-05",
      isVariableConfirmed: true,
    });
    const service = createService(mocks);

    const result = await service.updateBillForCycle(
      "bill-1",
      "instance-1",
      "profile-1",
      {
        defaultAmountCents: 160000,
        dueDateAbsolute: "2026-06-05",
        billType: "fixed",
      }
    );

    expect(result.bill.defaultAmountCents).toBe(160000);
    expect(result.billCycleInstance.cycleAmountCents).toBe(160000);
    expect(mocks.billRepository.update).toHaveBeenCalledWith("bill-1", {
      defaultAmountCents: 160000,
      dueDateAbsolute: "2026-06-05",
      billType: "fixed",
    });
    expect(mocks.billCycleInstanceRepository.update).toHaveBeenCalledWith(
      "instance-1",
      {
        cycleAmountCents: 160000,
        dueDate: "2026-06-05",
        isVariableConfirmed: true,
      },
      "profile-1"
    );
    expect(mocks.eventBus.emit).toHaveBeenLastCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("createBillForCycle_creates_cycle_instance_when_due_in_cycle", async () => {
    const mocks = createMocks();
    mocks.billRepository.create.mockResolvedValue(bill);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.create.mockResolvedValue({
      ...instance,
      isVariableConfirmed: true,
    });
    const service = createService(mocks);

    const result = await service.createBillForCycle(
      {
        profileId: "profile-1",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: 150000,
        recurrenceInterval: "monthly",
        dueDayOfCycle: 1,
      },
      {
        paycheckCycleId: "paycheck-1",
        startDate: "2026-06-01",
        nextStartDate: "2026-06-15",
      }
    );

    expect(result.bill).toBe(bill);
    expect(result.billCycleInstance).toEqual({
      ...instance,
      isVariableConfirmed: true,
    });
    expect(mocks.billCycleInstanceRepository.findByCycle).toHaveBeenCalledWith(
      "paycheck-1"
    );
    expect(mocks.billCycleInstanceRepository.create).toHaveBeenCalledWith(
      {
        billId: "bill-1",
        paycheckCycleId: "paycheck-1",
        cycleAmountCents: 150000,
        isVariableConfirmed: true,
        isPaid: false,
        dueDate: "2026-06-01",
      },
      "profile-1"
    );
    expect(mocks.eventBus.emit).toHaveBeenCalledTimes(2);
    expect(mocks.eventBus.emit).toHaveBeenLastCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("createBillForCycle_skips_instance_when_bill_is_not_due_in_cycle", async () => {
    const mocks = createMocks();
    mocks.billRepository.create.mockResolvedValue({
      ...bill,
      dueDayOfCycle: null,
      dueDateAbsolute: "2026-07-01",
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const result = await service.createBillForCycle(
      {
        profileId: "profile-1",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: 150000,
        recurrenceInterval: "monthly",
        dueDateAbsolute: "2026-07-01",
      },
      {
        paycheckCycleId: "paycheck-1",
        startDate: "2026-06-01",
        nextStartDate: "2026-06-15",
      }
    );

    expect(result.billCycleInstance).toBeNull();
    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
  });

  it("pauseBill_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.billRepository.pause.mockResolvedValue({ ...bill, isPaused: true });
    const service = createService(mocks);

    await service.pauseBill("bill-1");

    expect(mocks.billRepository.pause).toHaveBeenCalledWith("bill-1");
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_paused",
      entityType: "bill",
      entityId: "bill-1",
      summary: "Paused bill: Rent",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("pauseBillForCycle_pauses_parent_and_removes_visible_instance", async () => {
    const mocks = createMocks();
    mocks.billRepository.pause.mockResolvedValue({ ...bill, isPaused: true });
    const service = createService(mocks);

    await service.pauseBillForCycle("bill-1", "instance-1", "profile-1");

    expect(mocks.billRepository.pause).toHaveBeenCalledWith("bill-1");
    expect(mocks.billCycleInstanceRepository.softDelete).toHaveBeenCalledWith(
      "instance-1",
      "profile-1"
    );
    expect(mocks.eventBus.emit).toHaveBeenLastCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("resumeBill_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.billRepository.resume.mockResolvedValue(bill);
    const service = createService(mocks);

    await service.resumeBill("bill-1");

    expect(mocks.billRepository.resume).toHaveBeenCalledWith("bill-1");
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_resumed",
      entityType: "bill",
      entityId: "bill-1",
      summary: "Resumed bill: Rent",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("resumeBillForCycle_resumes_parent_and_regenerates_visible_instance", async () => {
    const mocks = createMocks();
    mocks.billRepository.resume.mockResolvedValue(bill);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.create.mockResolvedValue({
      ...instance,
      isVariableConfirmed: true,
    });
    const service = createService(mocks);

    const result = await service.resumeBillForCycle("bill-1", {
      paycheckCycleId: "paycheck-1",
      startDate: "2026-06-01",
      nextStartDate: "2026-06-15",
    });

    expect(result.bill).toBe(bill);
    expect(result.billCycleInstance).toEqual({
      ...instance,
      isVariableConfirmed: true,
    });
    expect(mocks.billRepository.resume).toHaveBeenCalledWith("bill-1");
    expect(mocks.billCycleInstanceRepository.create).toHaveBeenCalledWith(
      {
        billId: "bill-1",
        paycheckCycleId: "paycheck-1",
        cycleAmountCents: 150000,
        isVariableConfirmed: true,
        isPaid: false,
        dueDate: "2026-06-01",
      },
      "profile-1"
    );
    expect(mocks.eventBus.emit).toHaveBeenLastCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("createBillInstanceForCycle_materializes_existing_scheduled_bill", async () => {
    const mocks = createMocks();
    mocks.billRepository.findById.mockResolvedValue({
      ...bill,
      dueDayOfCycle: null,
      dueDateAbsolute: "2026-07-22",
    });
    mocks.billCycleInstanceRepository.findExisting.mockResolvedValue(null);
    mocks.billCycleInstanceRepository.create.mockResolvedValue({
      ...instance,
      dueDate: "2026-07-22",
      isVariableConfirmed: true,
    });
    const service = createService(mocks);

    const result = await service.createBillInstanceForCycle("bill-1", {
      paycheckCycleId: "paycheck-2",
      startDate: "2026-07-15",
      nextStartDate: "2026-07-29",
    });

    expect(result).toEqual({
      ...instance,
      dueDate: "2026-07-22",
      isVariableConfirmed: true,
    });
    expect(mocks.billRepository.findById).toHaveBeenCalledWith("bill-1");
    expect(mocks.billCycleInstanceRepository.findExisting).toHaveBeenCalledWith(
      "bill-1",
      "paycheck-2",
      "2026-07-22"
    );
    expect(mocks.billCycleInstanceRepository.create).toHaveBeenCalledWith(
      {
        billId: "bill-1",
        paycheckCycleId: "paycheck-2",
        cycleAmountCents: 150000,
        isVariableConfirmed: true,
        isPaid: false,
        dueDate: "2026-07-22",
      },
      "profile-1"
    );
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("createBillInstanceForCycle_returns_existing_cycle_instance_when_already_materialized", async () => {
    const mocks = createMocks();
    const existingInstance = {
      ...instance,
      id: "instance-existing",
      paycheckCycleId: "paycheck-2",
      dueDate: "2026-07-22",
    };

    mocks.billRepository.findById.mockResolvedValue({
      ...bill,
      dueDayOfCycle: null,
      dueDateAbsolute: "2026-07-22",
    });
    mocks.billCycleInstanceRepository.findExisting.mockResolvedValue(
      existingInstance
    );
    const service = createService(mocks);

    const result = await service.createBillInstanceForCycle("bill-1", {
      paycheckCycleId: "paycheck-2",
      startDate: "2026-07-15",
      nextStartDate: "2026-07-29",
    });

    expect(result).toBe(existingInstance);
    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(mocks.eventBus.emit).not.toHaveBeenCalled();
  });

  it("deleteBill_soft_deletes_existing_bill_logs_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.billRepository.findById.mockResolvedValue(bill);
    const service = createService(mocks);

    await service.deleteBill("bill-1");

    expect(mocks.billRepository.findById).toHaveBeenCalledWith("bill-1");
    expect(mocks.billRepository.softDelete).toHaveBeenCalledWith("bill-1");
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_deleted",
      entityType: "bill",
      entityId: "bill-1",
      summary: "Deleted bill: Rent",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("deleteBill_rejects_missing_bill_without_side_effects", async () => {
    const mocks = createMocks();
    mocks.billRepository.findById.mockResolvedValue(null);
    const service = createService(mocks);

    await expect(service.deleteBill("missing")).rejects.toThrow(
      "Bill missing not found."
    );
    expect(mocks.billRepository.softDelete).not.toHaveBeenCalled();
    expect(mocks.activityLogRepository.create).not.toHaveBeenCalled();
    expect(mocks.eventBus.emit).not.toHaveBeenCalled();
  });

  it("deleteBillForCycle_soft_deletes_bill_and_visible_cycle_instance", async () => {
    const mocks = createMocks();
    mocks.billRepository.findById.mockResolvedValue(bill);
    const service = createService(mocks);

    await service.deleteBillForCycle("bill-1", "instance-1", "profile-1");

    expect(mocks.billRepository.findById).toHaveBeenCalledWith("bill-1");
    expect(mocks.billRepository.softDelete).toHaveBeenCalledWith("bill-1");
    expect(mocks.billCycleInstanceRepository.softDelete).toHaveBeenCalledWith(
      "instance-1",
      "profile-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_deleted",
      entityType: "bill",
      entityId: "bill-1",
      summary: "Deleted bill: Rent",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markBillPaid_logs_bill_instance_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.billCycleInstanceRepository.markPaid.mockResolvedValue({
      ...instance,
      isPaid: true,
      paidAt: "2026-06-01T12:00:00.000Z",
    });
    const service = createService(mocks);

    const paid = await service.markBillPaid("instance-1", "profile-1");

    expect(paid.isPaid).toBe(true);
    expect(mocks.billCycleInstanceRepository.markPaid).toHaveBeenCalledWith(
      "instance-1",
      "profile-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_paid",
      entityType: "bill_instance",
      entityId: "instance-1",
      summary: "Paid bill: $1,500.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markBillUnpaid_logs_bill_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.billCycleInstanceRepository.markUnpaid.mockResolvedValue({
      ...instance,
      isPaid: false,
      paidAt: null,
    });
    const service = createService(mocks);

    const unpaid = await service.markBillUnpaid("instance-1", "profile-1");

    expect(unpaid.isPaid).toBe(false);
    expect(unpaid.paidAt).toBeNull();
    expect(mocks.billCycleInstanceRepository.markUnpaid).toHaveBeenCalledWith(
      "instance-1",
      "profile-1"
    );
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "bill_updated",
      entityType: "bill",
      entityId: "bill-1",
      summary: "Marked bill unpaid: $1,500.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("markBillPaidForCycle_materializes_and_marks_scheduled_bill_paid", async () => {
    const mocks = createMocks();
    const createdInstance = {
      ...instance,
      id: "instance-created",
      paycheckCycleId: "paycheck-2",
      dueDate: "2026-07-22",
      isVariableConfirmed: true,
    };
    const paidInstance = {
      ...createdInstance,
      isPaid: true,
    };

    mocks.billRepository.findById.mockResolvedValue({
      ...bill,
      dueDayOfCycle: null,
      dueDateAbsolute: "2026-07-22",
    });
    mocks.billCycleInstanceRepository.findExisting.mockResolvedValue(null);
    mocks.billCycleInstanceRepository.create.mockResolvedValue(createdInstance);
    mocks.billCycleInstanceRepository.markPaid.mockResolvedValue(paidInstance);
    const service = createService(mocks);

    const paid = await service.markBillPaidForCycle(
      "bill-1",
      {
        paycheckCycleId: "paycheck-2",
        startDate: "2026-07-15",
        nextStartDate: "2026-07-29",
      },
      "profile-1"
    );

    expect(paid).toBe(paidInstance);
    expect(mocks.billCycleInstanceRepository.markPaid).toHaveBeenCalledWith(
      "instance-created",
      "profile-1"
    );
  });

  it("markBillPaidForCycle_marks_existing_scheduled_bill_instance_paid", async () => {
    const mocks = createMocks();
    const existingInstance = {
      ...instance,
      id: "instance-existing",
      paycheckCycleId: "paycheck-2",
      dueDate: "2026-07-22",
    };
    const paidInstance = {
      ...existingInstance,
      isPaid: true,
    };

    mocks.billRepository.findById.mockResolvedValue({
      ...bill,
      dueDayOfCycle: null,
      dueDateAbsolute: "2026-07-22",
    });
    mocks.billCycleInstanceRepository.findExisting.mockResolvedValue(
      existingInstance
    );
    mocks.billCycleInstanceRepository.markPaid.mockResolvedValue(paidInstance);
    const service = createService(mocks);

    const paid = await service.markBillPaidForCycle(
      "bill-1",
      {
        paycheckCycleId: "paycheck-2",
        startDate: "2026-07-15",
        nextStartDate: "2026-07-29",
      },
      "profile-1"
    );

    expect(paid).toBe(paidInstance);
    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(mocks.billCycleInstanceRepository.markPaid).toHaveBeenCalledWith(
      "instance-existing",
      "profile-1"
    );
  });

  it("confirmVariableBillAmount_updates_instance_and_parent_default_amount", async () => {
    const mocks = createMocks();
    mocks.billCycleInstanceRepository.confirmVariableAmount.mockResolvedValue({
      ...instance,
      cycleAmountCents: 17500,
      isVariableConfirmed: true,
    });
    const service = createService(mocks);

    const confirmed = await service.confirmVariableBillAmount(
      "instance-1",
      17500,
      "profile-1"
    );

    expect(confirmed.cycleAmountCents).toBe(17500);
    expect(
      mocks.billCycleInstanceRepository.confirmVariableAmount
    ).toHaveBeenCalledWith("instance-1", 17500, "profile-1");
    expect(mocks.billRepository.update).toHaveBeenCalledWith("bill-1", {
      defaultAmountCents: 17500,
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "variable_bill_confirmed",
      entityType: "bill_instance",
      entityId: "instance-1",
      summary: "Confirmed variable bill: $175.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });
});
