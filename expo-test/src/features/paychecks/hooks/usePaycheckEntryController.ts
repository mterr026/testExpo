import { useState } from "react";

import { parseDollarInputToCents } from "@/shared/currency";
import { getAppRuntime } from "@/shared/services/appRuntime";
import type { PaycheckIncomeRole, PaycheckListItem, PaycheckRecurrence } from "@/shared/ui/types";

import { getOrCreateActiveProfile } from "@/shared/services/activeProfile";
import { getTodayIsoDate } from "@/shared/dates";

type UsePaycheckEntryControllerInput = {
  onPaychecksChanged?: () => void | Promise<void>;
};

export function usePaycheckEntryController({
  onPaychecksChanged,
}: UsePaycheckEntryControllerInput = {}) {
  const [paycheckModalOpen, setPaycheckModalOpen] = useState(false);
  const [editingPaycheck, setEditingPaycheck] =
    useState<PaycheckListItem | null>(null);
  const [paycheckLabel, setPaycheckLabel] = useState("");
  const [paycheckAmount, setPaycheckAmount] = useState("");
  const [paycheckExpectedDate, setPaycheckExpectedDate] =
    useState(getTodayIsoDate());
  const [paycheckRecurrence, setPaycheckRecurrence] =
    useState<PaycheckRecurrence>("none");
  const [paycheckIncomeRole, setPaycheckIncomeRole] =
    useState<PaycheckIncomeRole>("primary");
  const [paycheckError, setPaycheckError] = useState("");

  async function savePaycheck() {
    const amountCents = parseDollarInputToCents(paycheckAmount);

    if (amountCents === null || !paycheckExpectedDate.trim()) {
      setPaycheckError("Enter an amount above $0 and an expected date.");
      return;
    }

    try {
      const runtime = await getAppRuntime();
      const recurrenceInterval =
        paycheckRecurrence === "none" ? null : paycheckRecurrence;
      const isPrimary = paycheckIncomeRole === "primary";

      if (editingPaycheck) {
        await runtime.services.paycheckService.updatePaycheck(
          editingPaycheck.id,
          {
            label: paycheckLabel.trim() || null,
            amountCents,
            expectedDate: paycheckExpectedDate.trim(),
            isPrimary,
            isRecurring: recurrenceInterval != null,
            recurrenceInterval,
          }
        );
      } else {
        const profile = await getOrCreateActiveProfile(runtime);

        await runtime.services.paycheckService.createPaycheck({
          profileId: profile.id,
          label: paycheckLabel.trim() || null,
          amountCents,
          expectedDate: paycheckExpectedDate.trim(),
          isPrimary,
          isReceived: false,
          isRecurring: recurrenceInterval != null,
          recurrenceInterval,
        });
      }
      await onPaychecksChanged?.();
      closePaycheckModal();
    } catch {
      setPaycheckError("Paycheck could not be saved.");
    }
  }

  function closePaycheckModal() {
    setEditingPaycheck(null);
    setPaycheckLabel("");
    setPaycheckAmount("");
    setPaycheckExpectedDate(getTodayIsoDate());
    setPaycheckRecurrence("none");
    setPaycheckIncomeRole("primary");
    setPaycheckError("");
    setPaycheckModalOpen(false);
  }

  function openAddPaycheck() {
    setEditingPaycheck(null);
    setPaycheckLabel("");
    setPaycheckAmount("");
    setPaycheckExpectedDate(getTodayIsoDate());
    setPaycheckRecurrence("none");
    setPaycheckIncomeRole("primary");
    setPaycheckError("");
    setPaycheckModalOpen(true);
  }

  function openPaycheckEdit(paycheck: PaycheckListItem) {
    setEditingPaycheck(paycheck);
    setPaycheckLabel(paycheck.label);
    setPaycheckAmount((paycheck.amountCents / 100).toFixed(2));
    setPaycheckExpectedDate(paycheck.expectedDate);
    setPaycheckRecurrence(paycheck.recurrenceInterval ?? "none");
    setPaycheckIncomeRole(paycheck.isPrimary ? "primary" : "secondary");
    setPaycheckError("");
    setPaycheckModalOpen(true);
  }

  async function confirmPaycheck(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.paycheckService.markPaycheckReceived(id);
      await onPaychecksChanged?.();
    } catch {
      setPaycheckError("Paycheck could not be confirmed.");
    }
  }

  async function markPaycheckUnreceived(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.paycheckService.markPaycheckUnreceived(id);
      await onPaychecksChanged?.();
    } catch {
      setPaycheckError("Paycheck could not be marked expected.");
    }
  }

  async function deletePaycheck(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.paycheckService.deletePaycheck(id);
      await onPaychecksChanged?.();
    } catch {
      setPaycheckError("Paycheck could not be deleted.");
    }
  }

  return {
    confirmPaycheck,
    deletePaycheck,
    markPaycheckUnreceived,
    openAddPaycheck,
    openPaycheckEdit,
    paycheckEntry: {
      amount: paycheckAmount,
      close: closePaycheckModal,
      error: paycheckError,
      expectedDate: paycheckExpectedDate,
      incomeRole: paycheckIncomeRole,
      label: paycheckLabel,
      mode: editingPaycheck ? "edit" as const : "add" as const,
      recurrence: paycheckRecurrence,
      save: savePaycheck,
      setAmount: (text: string) => {
        setPaycheckAmount(text);
        setPaycheckError("");
      },
      setExpectedDate: (text: string) => {
        setPaycheckExpectedDate(text);
        setPaycheckError("");
      },
      setIncomeRole: (role: PaycheckIncomeRole) => {
        setPaycheckIncomeRole(role);
        setPaycheckError("");
      },
      setLabel: (text: string) => {
        setPaycheckLabel(text);
        setPaycheckError("");
      },
      setRecurrence: (recurrence: PaycheckRecurrence) => {
        setPaycheckRecurrence(recurrence);
        setPaycheckError("");
      },
      visible: paycheckModalOpen,
    },
  };
}
