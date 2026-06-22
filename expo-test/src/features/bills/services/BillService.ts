import type {
  ActivityLogRepository,
  BillCycleInstanceRepository,
  BillRepository,
} from "@/database/repositories";
import type {
  Bill,
  BillChanges,
  BillCycleInstance,
  NewBill,
} from "@/database/repositories/types";
import { generateBillCycleInstances, type BillCycleWindow } from "@/engine";
import { formatCurrency } from "@/shared/currency";
import {
  FINANCIAL_STATE_CHANGED,
  type FinancialEventBus,
} from "@/shared/events/financialEvents";

export class BillService {
  constructor(
    private readonly billRepository: BillRepository,
    private readonly billCycleInstanceRepository: BillCycleInstanceRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly eventBus: FinancialEventBus
  ) {}

  async createBill(input: NewBill): Promise<Bill> {
    const bill = await this.billRepository.create(input);

    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_added",
      entityType: "bill",
      entityId: bill.id,
      summary: `Added bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(bill.profileId);

    return bill;
  }

  async createBillForCycle(
    input: NewBill,
    cycle: BillCycleWindow
  ): Promise<{
    bill: Bill;
    billCycleInstance: BillCycleInstance | null;
  }> {
    const bill = await this.createBill(input);
    const existingInstances =
      await this.billCycleInstanceRepository.findByCycle(cycle.paycheckCycleId);
    const [generatedInstance] = generateBillCycleInstances({
      bills: [bill],
      cycle,
      existingInstances,
    });

    if (!generatedInstance) {
      return { bill, billCycleInstance: null };
    }

    const billCycleInstance = await this.billCycleInstanceRepository.create(
      {
        billId: generatedInstance.billId,
        paycheckCycleId: generatedInstance.paycheckCycleId,
        cycleAmountCents: generatedInstance.cycleAmountCents,
        isVariableConfirmed: generatedInstance.isVariableConfirmed,
        isPaid: generatedInstance.isPaid,
        dueDate: generatedInstance.dueDate,
      },
      bill.profileId
    );
    this.emitFinancialStateChanged(bill.profileId);

    return { bill, billCycleInstance };
  }

  async updateBill(id: string, changes: BillChanges): Promise<Bill> {
    const bill = await this.billRepository.update(id, changes);

    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_updated",
      entityType: "bill",
      entityId: bill.id,
      summary: `Updated bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(bill.profileId);

    return bill;
  }

  async updateBillForCycle(
    billId: string,
    billCycleInstanceId: string,
    profileId: string,
    changes: BillChanges
  ): Promise<{
    bill: Bill;
    billCycleInstance: BillCycleInstance;
  }> {
    const bill = await this.billRepository.update(billId, changes);
    const instanceChanges = {
      ...(changes.defaultAmountCents != null
        ? { cycleAmountCents: changes.defaultAmountCents }
        : {}),
      ...(changes.dueDateAbsolute != null
        ? { dueDate: changes.dueDateAbsolute }
        : {}),
      ...(changes.billType != null
        ? { isVariableConfirmed: changes.billType === "fixed" }
        : {}),
    };
    const billCycleInstance =
      await this.billCycleInstanceRepository.update(
        billCycleInstanceId,
        instanceChanges,
        profileId
      );
    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_updated",
      entityType: "bill",
      entityId: bill.id,
      summary: `Updated bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(profileId);

    return { bill, billCycleInstance };
  }

  async pauseBill(id: string): Promise<Bill> {
    const bill = await this.billRepository.pause(id);

    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_paused",
      entityType: "bill",
      entityId: bill.id,
      summary: `Paused bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(bill.profileId);

    return bill;
  }

  async pauseBillForCycle(
    billId: string,
    billCycleInstanceId: string,
    profileId: string
  ): Promise<Bill> {
    const bill = await this.billRepository.pause(billId);

    await this.billCycleInstanceRepository.softDelete(
      billCycleInstanceId,
      profileId
    );
    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_paused",
      entityType: "bill",
      entityId: bill.id,
      summary: `Paused bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(profileId);

    return bill;
  }

  async resumeBill(id: string): Promise<Bill> {
    const bill = await this.billRepository.resume(id);

    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_resumed",
      entityType: "bill",
      entityId: bill.id,
      summary: `Resumed bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(bill.profileId);

    return bill;
  }

  async resumeBillForCycle(
    billId: string,
    cycle: BillCycleWindow
  ): Promise<{
    bill: Bill;
    billCycleInstance: BillCycleInstance | null;
  }> {
    const bill = await this.billRepository.resume(billId);
    const existingInstances =
      await this.billCycleInstanceRepository.findByCycle(cycle.paycheckCycleId);
    const [generatedInstance] = generateBillCycleInstances({
      bills: [bill],
      cycle,
      existingInstances,
    });

    if (!generatedInstance) {
      await this.activityLogRepository.create({
        profileId: bill.profileId,
        eventType: "bill_resumed",
        entityType: "bill",
        entityId: bill.id,
        summary: `Resumed bill: ${bill.name}`,
      });
      this.emitFinancialStateChanged(bill.profileId);

      return { bill, billCycleInstance: null };
    }

    const billCycleInstance = await this.billCycleInstanceRepository.create(
      {
        billId: generatedInstance.billId,
        paycheckCycleId: generatedInstance.paycheckCycleId,
        cycleAmountCents: generatedInstance.cycleAmountCents,
        isVariableConfirmed: generatedInstance.isVariableConfirmed,
        isPaid: generatedInstance.isPaid,
        dueDate: generatedInstance.dueDate,
      },
      bill.profileId
    );
    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_resumed",
      entityType: "bill",
      entityId: bill.id,
      summary: `Resumed bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(bill.profileId);

    return { bill, billCycleInstance };
  }

  async createBillInstanceForCycle(
    billId: string,
    cycle: BillCycleWindow
  ): Promise<BillCycleInstance | null> {
    const bill = await this.billRepository.findById(billId);

    if (!bill) {
      throw new Error(`Bill ${billId} not found.`);
    }

    const [generatedInstance] = generateBillCycleInstances({
      bills: [bill],
      cycle,
    });

    if (!generatedInstance) {
      return null;
    }

    const existingInstance = await this.billCycleInstanceRepository.findExisting(
      generatedInstance.billId,
      generatedInstance.paycheckCycleId,
      generatedInstance.dueDate
    );

    if (existingInstance) {
      return existingInstance;
    }

    const billCycleInstance = await this.billCycleInstanceRepository.create(
      {
        billId: generatedInstance.billId,
        paycheckCycleId: generatedInstance.paycheckCycleId,
        cycleAmountCents: generatedInstance.cycleAmountCents,
        isVariableConfirmed: generatedInstance.isVariableConfirmed,
        isPaid: generatedInstance.isPaid,
        dueDate: generatedInstance.dueDate,
      },
      bill.profileId
    );
    this.emitFinancialStateChanged(bill.profileId);

    return billCycleInstance;
  }

  async deleteBill(id: string): Promise<void> {
    const bill = await this.billRepository.findById(id);

    if (!bill) {
      throw new Error(`Bill ${id} not found.`);
    }

    await this.billRepository.softDelete(id);
    await this.activityLogRepository.create({
      profileId: bill.profileId,
      eventType: "bill_deleted",
      entityType: "bill",
      entityId: bill.id,
      summary: `Deleted bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(bill.profileId);
  }

  async deleteBillForCycle(
    billId: string,
    billCycleInstanceId: string,
    profileId: string
  ): Promise<void> {
    const bill = await this.billRepository.findById(billId);

    if (!bill) {
      throw new Error(`Bill ${billId} not found.`);
    }

    await this.billRepository.softDelete(billId);
    await this.billCycleInstanceRepository.softDelete(
      billCycleInstanceId,
      profileId
    );
    await this.activityLogRepository.create({
      profileId,
      eventType: "bill_deleted",
      entityType: "bill",
      entityId: bill.id,
      summary: `Deleted bill: ${bill.name}`,
    });
    this.emitFinancialStateChanged(profileId);
  }

  async markBillPaid(
    billCycleInstanceId: string,
    profileId: string
  ): Promise<BillCycleInstance> {
    const instance = await this.billCycleInstanceRepository.markPaid(
      billCycleInstanceId,
      profileId
    );

    await this.activityLogRepository.create({
      profileId,
      eventType: "bill_paid",
      entityType: "bill_instance",
      entityId: instance.id,
      summary: `Paid bill: ${formatCurrency(instance.cycleAmountCents)}`,
    });
    this.emitFinancialStateChanged(profileId);

    return instance;
  }

  async markBillPaidForCycle(
    billId: string,
    cycle: BillCycleWindow,
    profileId: string
  ): Promise<BillCycleInstance> {
    const instance = await this.createBillInstanceForCycle(billId, cycle);

    if (!instance) {
      throw new Error(`Bill ${billId} is not due in this paycheck cycle.`);
    }

    if (instance.isPaid) {
      return instance;
    }

    return this.markBillPaid(instance.id, profileId);
  }

  async markBillUnpaid(
    billCycleInstanceId: string,
    profileId: string
  ): Promise<BillCycleInstance> {
    const instance = await this.billCycleInstanceRepository.markUnpaid(
      billCycleInstanceId,
      profileId
    );

    await this.activityLogRepository.create({
      profileId,
      eventType: "bill_updated",
      entityType: "bill",
      entityId: instance.billId,
      summary: `Marked bill unpaid: ${formatCurrency(instance.cycleAmountCents)}`,
    });
    this.emitFinancialStateChanged(profileId);

    return instance;
  }

  async confirmVariableBillAmount(
    billCycleInstanceId: string,
    amountCents: number,
    profileId: string
  ): Promise<BillCycleInstance> {
    const instance =
      await this.billCycleInstanceRepository.confirmVariableAmount(
        billCycleInstanceId,
        amountCents,
        profileId
      );
    await this.billRepository.update(instance.billId, {
      defaultAmountCents: amountCents,
    });

    await this.activityLogRepository.create({
      profileId,
      eventType: "variable_bill_confirmed",
      entityType: "bill_instance",
      entityId: instance.id,
      summary: `Confirmed variable bill: ${formatCurrency(amountCents)}`,
    });
    this.emitFinancialStateChanged(profileId);

    return instance;
  }

  private emitFinancialStateChanged(profileId: string) {
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profileId);
  }
}
