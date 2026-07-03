import { useState } from "react";

import type { BillType } from "@/database/repositories/types";
import { OPEN_ENDED_PAYCHECK_CYCLE_DATE } from "@/engine";
import type { DashboardSnapshot } from "@/features/dashboard/services";
import { parseDollarInputToCents } from "@/shared/currency";
import type { Bill, BillRepeatMode } from "@/shared/ui/types";
import { getAppRuntime } from "@/shared/services/appRuntime";

import {
  shouldDeleteEntireBillDefinition,
  shouldUpdateBillDefinitionOnly,
} from "@/features/bills/billDeletion";
import { getPaidBillInstanceId } from "@/features/bills/billCycleResolution";
import { getOrCreateActiveProfile } from "@/shared/services/activeProfile";
import { getTodayIsoDate } from "@/shared/dates";

type UseBillEntryControllerInput = {
  bills: Bill[];
  dashboardSnapshot: DashboardSnapshot | null;
  onBillsChanged?: () => void | Promise<void>;
  setBills: (bills: Bill[]) => void;
};

export function useBillEntryController({
  bills,
  dashboardSnapshot,
  onBillsChanged,
  setBills,
}: UseBillEntryControllerInput) {
  const [confirmingBill, setConfirmingBill] = useState<Bill | null>(null);
  const [billAmountDraft, setBillAmountDraft] = useState("");
  const [billConfirmError, setBillConfirmError] = useState("");
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState(getTodayIsoDate());
  const [billRepeatMode, setBillRepeatMode] =
    useState<BillRepeatMode>("recurring");
  const [billType, setBillType] = useState<BillType>("fixed");
  const [billError, setBillError] = useState("");

  async function saveBill() {
    const amountCents = parseDollarInputToCents(billAmount);

    if (!billName.trim() || amountCents === null || !billDueDate.trim()) {
      setBillError("Enter a bill name, amount, and due date.");
      return;
    }

    try {
      const runtime = await getAppRuntime();
      const profile = await getOrCreateActiveProfile(runtime);
      const oneTimeEndDate =
        billRepeatMode === "one-time"
          ? getOneTimeBillEndDate(billDueDate.trim())
          : null;

      if (billRepeatMode === "one-time" && !oneTimeEndDate) {
        setBillError("Enter a valid due date.");
        return;
      }

      const input = {
        profileId: profile.id,
        name: billName.trim(),
        billType,
        defaultAmountCents: amountCents,
        recurrenceInterval: "monthly" as const,
        dueDateAbsolute: billDueDate.trim(),
        endDate: oneTimeEndDate,
      };

      if (editingBill?.billId) {
        const changes = {
          name: input.name,
          billType: input.billType,
          defaultAmountCents: input.defaultAmountCents,
          dueDateAbsolute: input.dueDateAbsolute,
          endDate: input.endDate,
        };

        if (shouldUpdateBillDefinitionOnly(editingBill)) {
          await runtime.services.billService.updateBill(editingBill.billId, changes);
        } else {
          await runtime.services.billService.updateBillForCycle(
            editingBill.billId,
            editingBill.id,
            profile.id,
            changes
          );
        }
      } else if (dashboardSnapshot) {
        const activeCycle = getActiveBillCycle(dashboardSnapshot);

        if (activeCycle) {
          await runtime.services.billService.createBillForCycle(
            input,
            activeCycle
          );
        } else {
          await runtime.services.billService.createBill(input);
        }
      } else {
        await runtime.services.billService.createBill(input);
      }

      await onBillsChanged?.();
      closeBillModal();
    } catch (error) {
      console.error("Bill could not be saved.", error);
      setBillError("Bill could not be saved.");
    }
  }

  function closeBillModal() {
    setEditingBill(null);
    setBillName("");
    setBillAmount("");
    setBillDueDate(getTodayIsoDate());
    setBillRepeatMode("recurring");
    setBillType("fixed");
    setBillError("");
    setBillModalOpen(false);
  }

  function openAddBill() {
    setEditingBill(null);
    setBillName("");
    setBillAmount("");
    setBillDueDate(getTodayIsoDate());
    setBillRepeatMode("recurring");
    setBillType("fixed");
    setBillError("");
    setBillModalOpen(true);
  }

  function openBillEdit(bill: Bill) {
    setEditingBill(bill);
    setBillName(bill.name);
    setBillAmount((bill.amountCents / 100).toFixed(2));
    setBillDueDate(bill.dueDate);
    setBillRepeatMode(bill.endDate ? "one-time" : "recurring");
    setBillType(bill.billType ?? "fixed");
    setBillError("");
    setBillModalOpen(true);
  }

  async function markBillPaid(billToMark: Bill) {
    if (!dashboardSnapshot?.profile) {
      setBills(
        bills.map((bill) =>
          bill.id === billToMark.id ? { ...bill, status: "Paid" } : bill
        )
      );
      await onBillsChanged?.();
      return;
    }

    try {
      const runtime = await getAppRuntime();
      if (
        billToMark.status === "Scheduled" ||
        billToMark.status === "Projected"
      ) {
        if (!billToMark.billId) {
          throw new Error("Scheduled bill is missing its bill id.");
        }

        const cycle = getBillCycleForDueDate(
          dashboardSnapshot,
          billToMark.dueDate
        );

        if (!cycle) {
          throw new Error("Scheduled bill is not in a paycheck cycle yet.");
        }

        await runtime.services.billService.markBillPaidForCycle(
          billToMark.billId,
          cycle,
          dashboardSnapshot.profile.id
        );
        await onBillsChanged?.();
        return;
      }

      await runtime.services.billService.markBillPaid(
        billToMark.id,
        dashboardSnapshot.profile.id
      );
      await onBillsChanged?.();
    } catch (error) {
      console.error("Bill could not be marked paid.", error);
      setBillError("Bill could not be marked paid.");
      throw error;
    }
  }

  async function markBillUnpaid(billToMark: Bill) {
    if (!dashboardSnapshot?.profile) {
      setBills(
        bills.map((bill) =>
          bill.id === billToMark.id ? { ...bill, status: "Due" } : bill
        )
      );
      await onBillsChanged?.();
      return;
    }

    try {
      const runtime = await getAppRuntime();
      const paidBillInstanceId = getPaidBillInstanceId(
        billToMark,
        dashboardSnapshot.allBillInstances.length > 0
          ? dashboardSnapshot.allBillInstances
          : dashboardSnapshot.billInstances
      );

      if (!paidBillInstanceId) {
        throw new Error("Bill does not have a paid cycle item to restore.");
      }

      await runtime.services.billService.markBillUnpaid(
        paidBillInstanceId,
        dashboardSnapshot.profile.id
      );
      await onBillsChanged?.();
    } catch (error) {
      console.error("Bill could not be marked unpaid.", error);
      setBillError("Bill could not be marked unpaid.");
      throw error;
    }
  }

  async function deleteBill(bill: Bill) {
    if (!dashboardSnapshot?.profile || !bill.billId) {
      setBills(bills.filter((candidate) => candidate.id !== bill.id));
      await onBillsChanged?.();
      return;
    }

    try {
      const runtime = await getAppRuntime();

      if (shouldDeleteEntireBillDefinition(bill)) {
        await runtime.services.billService.deleteBill(bill.billId);
      } else {
        await runtime.services.billService.deleteBillForCycle(
          bill.billId,
          bill.id,
          dashboardSnapshot.profile.id
        );
      }

      setBillError("");
      await onBillsChanged?.();
    } catch {
      setBillError("Bill could not be deleted.");
    }
  }

  async function toggleBillPaused(bill: Bill) {
    if (!dashboardSnapshot?.profile || !bill.billId) {
      return;
    }

    try {
      const runtime = await getAppRuntime();

      if (bill.isPaused) {
        const activeCycle = getActiveBillCycle(dashboardSnapshot);

        if (activeCycle) {
          await runtime.services.billService.resumeBillForCycle(bill.billId, {
            paycheckCycleId: activeCycle.paycheckCycleId,
            startDate: activeCycle.startDate,
            nextStartDate: activeCycle.nextStartDate,
          });
        } else {
          await runtime.services.billService.resumeBill(bill.billId);
        }
      } else {
        if (bill.id === bill.billId || bill.status === "Scheduled") {
          await runtime.services.billService.pauseBill(bill.billId);
        } else {
          await runtime.services.billService.pauseBillForCycle(
            bill.billId,
            bill.id,
            dashboardSnapshot.profile.id
          );
        }
      }
      await onBillsChanged?.();
    } catch {
      setBillError(
        bill.isPaused ? "Bill could not be resumed." : "Bill could not be paused."
      );
    }
  }

  function openBillConfirmation(bill: Bill) {
    setConfirmingBill(bill);
    setBillAmountDraft((bill.amountCents / 100).toFixed(2));
    setBillConfirmError("");
  }

  function closeBillConfirmation() {
    setConfirmingBill(null);
    setBillAmountDraft("");
    setBillConfirmError("");
  }

  async function confirmBillAmount() {
    if (!confirmingBill) {
      return;
    }

    const amountCents = parseDollarInputToCents(billAmountDraft);

    if (amountCents === null) {
      setBillConfirmError("Enter an amount above $0.");
      return;
    }

    if (!dashboardSnapshot?.profile) {
      setBills(
        bills.map((bill) =>
          bill.id === confirmingBill.id
            ? { ...bill, amountCents, status: "Due" }
            : bill
        )
      );
      await onBillsChanged?.();
      closeBillConfirmation();
      return;
    }

    try {
      const runtime = await getAppRuntime();

      await runtime.services.billService.confirmVariableBillAmount(
        confirmingBill.id,
        amountCents,
        dashboardSnapshot.profile.id
      );
      await onBillsChanged?.();
      closeBillConfirmation();
    } catch {
      setBillConfirmError("Bill amount could not be confirmed.");
    }
  }

  return {
    billEntry: {
      amount: billAmount,
      billType,
      close: closeBillModal,
      dueDate: billDueDate,
      error: billError,
      mode: editingBill ? "edit" as const : "add" as const,
      name: billName,
      repeatMode: billRepeatMode,
      save: saveBill,
      setAmount: (text: string) => {
        setBillAmount(text);
        setBillError("");
      },
      setBillType,
      setDueDate: (text: string) => {
        setBillDueDate(text);
        setBillError("");
      },
      setName: (text: string) => {
        setBillName(text);
        setBillError("");
      },
      setRepeatMode: (repeatMode: BillRepeatMode) => {
        setBillRepeatMode(repeatMode);
        setBillError("");
      },
      visible: billModalOpen,
    },
    billConfirmation: {
      amountDraft: billAmountDraft,
      bill: confirmingBill,
      close: closeBillConfirmation,
      error: billConfirmError,
      save: confirmBillAmount,
      setAmountDraft: (text: string) => {
        setBillAmountDraft(text);
        setBillConfirmError("");
      },
    },
    deleteBill,
    markBillPaid,
    markBillUnpaid,
    openAddBill,
    openBillConfirmation,
    openBillEdit,
    setBillModalOpen,
    toggleBillPaused,
  };
}

function getOneTimeBillEndDate(dueDate: string) {
  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !year ||
    !month ||
    !day ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
}

function getBillCycleForDueDate(
  dashboardSnapshot: DashboardSnapshot,
  dueDate: string
) {
  const activeCycle = getActiveBillCycle(dashboardSnapshot);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return activeCycle;
  }

  if (
    activeCycle &&
    activeCycle.startDate <= dueDate &&
    dueDate < activeCycle.nextStartDate
  ) {
    return activeCycle;
  }

  const sortedPaychecks = [...dashboardSnapshot.paychecks].sort((first, second) =>
    first.expectedDate.localeCompare(second.expectedDate)
  );

  for (let index = sortedPaychecks.length - 1; index >= 0; index -= 1) {
    const paycheck = sortedPaychecks[index];
    const nextPaycheck = sortedPaychecks[index + 1] ?? null;

    if (
      paycheck.expectedDate <= dueDate &&
      (!nextPaycheck || dueDate < nextPaycheck.expectedDate)
    ) {
      return {
        paycheckCycleId: paycheck.id,
        startDate: paycheck.expectedDate,
        nextStartDate:
          nextPaycheck?.expectedDate ?? OPEN_ENDED_PAYCHECK_CYCLE_DATE,
      };
    }
  }

  return dashboardSnapshot.currentCycleAnchor
    ? {
        paycheckCycleId: dashboardSnapshot.currentCycleAnchor.id,
        startDate: dashboardSnapshot.currentCycleAnchor.expectedDate,
        nextStartDate:
          dashboardSnapshot.nextCycleAnchor?.expectedDate ??
          OPEN_ENDED_PAYCHECK_CYCLE_DATE,
      }
    : activeCycle;
}

function getActiveBillCycle(dashboardSnapshot: DashboardSnapshot) {
  if (
    !dashboardSnapshot.activeCyclePaycheckId ||
    !dashboardSnapshot.activeCycleStartDate ||
    !dashboardSnapshot.activeCycleEndDate
  ) {
    return null;
  }

  return {
    paycheckCycleId: dashboardSnapshot.activeCyclePaycheckId,
    startDate: dashboardSnapshot.activeCycleStartDate,
    nextStartDate: dashboardSnapshot.activeCycleEndDate,
  };
}
