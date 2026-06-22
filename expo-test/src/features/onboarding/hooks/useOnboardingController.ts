import { useState } from "react";

import { useFinancialState } from "@/context/FinancialStateContext";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { useProfile } from "@/context/ProfileContext";
import type { OnboardingStep } from "@/features/onboarding/OnboardingModal";
import { parseDollarInputToCents } from "@/shared/currency";
import { getAppRuntime } from "@/shared/services/appRuntime";
import type { PaycheckRecurrence, PaycheckRecurrenceInterval } from "@/shared/ui/types";

import { getTodayIsoDate } from "@/features/app/homeData";

type PendingPaycheck = {
  amountCents: number;
  expectedDate: string;
  label: string | null;
  recurrenceInterval: PaycheckRecurrenceInterval | null;
};

type PendingBill = {
  amountCents: number;
  dueDate: string;
  name: string;
};

type UseOnboardingControllerInput = {
  onOnboardingComplete?: () => void | Promise<void>;
  getPendingImportSuggestionCount?: () => number;
  clearImportSuggestions?: () => void | Promise<void>;
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function useOnboardingController({
  onOnboardingComplete,
  getPendingImportSuggestionCount,
  clearImportSuggestions,
}: UseOnboardingControllerInput = {}) {
  const { refreshDashboardSnapshot } = useFinancialState();
  const { profile } = useProfile();
  const { isOnboardingRequired } = useOnboardingContext();
  const [step, setStep] = useState<OnboardingStep>("balance");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [reserveAmount, setReserveAmount] = useState("");
  const [paycheckLabel, setPaycheckLabel] = useState("");
  const [paycheckAmount, setPaycheckAmount] = useState("");
  const [paycheckExpectedDate, setPaycheckExpectedDate] =
    useState(getTodayIsoDate());
  const [paycheckRecurrence, setPaycheckRecurrence] =
    useState<PaycheckRecurrence>("none");
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState(getTodayIsoDate());
  const [pendingOpeningBalanceCents, setPendingOpeningBalanceCents] = useState(0);
  const [pendingEssentialReserveCents, setPendingEssentialReserveCents] =
    useState(0);
  const [pendingPaycheck, setPendingPaycheck] = useState<PendingPaycheck | null>(
    null
  );
  const [pendingBill, setPendingBill] = useState<PendingBill | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function resetOnboardingForm() {
    setBalanceAmount("");
    setReserveAmount("");
    setPaycheckLabel("");
    setPaycheckAmount("");
    setPaycheckExpectedDate(getTodayIsoDate());
    setPaycheckRecurrence("none");
    setBillName("");
    setBillAmount("");
    setBillDueDate(getTodayIsoDate());
    setStep("balance");
    setPendingOpeningBalanceCents(0);
    setPendingEssentialReserveCents(0);
    setPendingPaycheck(null);
    setPendingBill(null);
  }

  async function finishOnboarding(
    openingBalanceCents: number,
    essentialReserveCents: number,
    paycheck: PendingPaycheck | null,
    bill: PendingBill | null
  ) {
    const profileId = profile?.id;

    if (!profileId) {
      setError("Profile could not be loaded.");
      return false;
    }

    setIsSaving(true);
    setError("");

    try {
      const runtime = await getAppRuntime();

      await runtime.services.onboardingService.completeOnboarding(profileId, {
        openingBalanceCents,
        essentialReserveCents,
      });

      if (paycheck) {
        await runtime.services.paycheckService.createPaycheck({
          profileId,
          label: paycheck.label,
          amountCents: paycheck.amountCents,
          expectedDate: paycheck.expectedDate,
          isReceived: false,
          isRecurring: paycheck.recurrenceInterval != null,
          recurrenceInterval: paycheck.recurrenceInterval,
        });
      }

      if (bill) {
        await runtime.services.billService.createBill({
          profileId,
          name: bill.name,
          billType: "fixed",
          defaultAmountCents: bill.amountCents,
          recurrenceInterval: "monthly",
          dueDateAbsolute: bill.dueDate,
          endDate: null,
        });
      }

      await refreshDashboardSnapshot();
      await onOnboardingComplete?.();

      const dbProfile =
        await runtime.repositories.profileRepository.findById(profileId);

      if (!dbProfile?.onboardingComplete) {
        setError("Onboarding could not be marked complete.");
        return false;
      }

      resetOnboardingForm();
      return true;
    } catch (finishError) {
      setError(`Onboarding could not be saved. ${formatError(finishError)}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function parseOptionalPaycheck(): PendingPaycheck | null | "invalid" {
    const hasInput =
      paycheckLabel.trim() ||
      paycheckAmount.trim() ||
      paycheckRecurrence !== "none";

    if (!hasInput) {
      return null;
    }

    const amountCents = parseDollarInputToCents(paycheckAmount);

    if (amountCents === null || !paycheckExpectedDate.trim()) {
      return "invalid";
    }

    const recurrenceInterval =
      paycheckRecurrence === "none" ? null : paycheckRecurrence;

    return {
      amountCents,
      expectedDate: paycheckExpectedDate.trim(),
      label: paycheckLabel.trim() || null,
      recurrenceInterval,
    };
  }

  function parseOptionalBill(): PendingBill | null | "invalid" {
    const hasInput = billName.trim() || billAmount.trim();

    if (!hasInput) {
      return null;
    }

    const amountCents = parseDollarInputToCents(billAmount);

    if (!billName.trim() || amountCents === null || !billDueDate.trim()) {
      return "invalid";
    }

    return {
      amountCents,
      dueDate: billDueDate.trim(),
      name: billName.trim(),
    };
  }

  async function continueOnboarding() {
    if (step === "balance") {
      const openingBalanceCents = parseDollarInputToCents(balanceAmount);

      if (openingBalanceCents === null) {
        setError("Enter a valid balance amount.");
        return;
      }

      setPendingOpeningBalanceCents(openingBalanceCents);
      setError("");
      setStep("reserve");
      return;
    }

    if (step === "reserve") {
      const essentialReserveCents = parseDollarInputToCents(reserveAmount);

      if (essentialReserveCents === null) {
        setError("Enter a valid reserve amount.");
        return;
      }

      setPendingEssentialReserveCents(essentialReserveCents);
      setError("");
      setStep("paycheck");
      return;
    }

    if (step === "paycheck") {
      const paycheck = parseOptionalPaycheck();

      if (paycheck === "invalid") {
        setError("Enter an amount and expected date for your paycheck.");
        return;
      }

      setPendingPaycheck(paycheck);
      setError("");
      setStep("bill");
      return;
    }

    if (step === "bill") {
      const bill = parseOptionalBill();

      if (bill === "invalid") {
        setError("Enter a bill name, amount, and due date.");
        return;
      }

      setPendingBill(bill);
      setError("");
      setStep("import");
      return;
    }

    const pendingImportCount = getPendingImportSuggestionCount?.() ?? 0;

    if (pendingImportCount > 0) {
      setError(
        `Review ${pendingImportCount} import suggestion${pendingImportCount === 1 ? "" : "s"} first. Confirm each as a paycheck or bill, or ignore it.`
      );
      return;
    }

    await finishOnboarding(
      pendingOpeningBalanceCents,
      pendingEssentialReserveCents,
      pendingPaycheck,
      pendingBill
    );
  }

  async function skipOnboarding() {
    if (step === "reserve") {
      setPendingEssentialReserveCents(0);
      setError("");
      setStep("paycheck");
      return;
    }

    if (step === "paycheck") {
      setPendingPaycheck(null);
      setError("");
      setStep("bill");
      return;
    }

    if (step === "bill") {
      setPendingBill(null);
      setError("");
      setStep("import");
      return;
    }

    if (step === "import") {
      await clearImportSuggestions?.();
    }

    await finishOnboarding(
      pendingOpeningBalanceCents,
      pendingEssentialReserveCents,
      pendingPaycheck,
      pendingBill
    );
  }

  return {
    onboarding: {
      balanceAmount,
      billAmount,
      billDueDate,
      billName,
      error,
      isSaving,
      paycheckAmount,
      paycheckExpectedDate,
      paycheckLabel,
      paycheckRecurrence,
      reserveAmount,
      setBalanceAmount,
      setBillAmount: (text: string) => {
        setBillAmount(text);
        setError("");
      },
      setBillDueDate: (text: string) => {
        setBillDueDate(text);
        setError("");
      },
      setBillName: (text: string) => {
        setBillName(text);
        setError("");
      },
      setPaycheckAmount: (text: string) => {
        setPaycheckAmount(text);
        setError("");
      },
      setPaycheckExpectedDate: (text: string) => {
        setPaycheckExpectedDate(text);
        setError("");
      },
      setPaycheckLabel: (text: string) => {
        setPaycheckLabel(text);
        setError("");
      },
      setPaycheckRecurrence: (recurrence: PaycheckRecurrence) => {
        setPaycheckRecurrence(recurrence);
        setError("");
      },
      setReserveAmount,
      continueOnboarding,
      skipOnboarding,
      step,
      visible: isOnboardingRequired,
    },
  };
}
