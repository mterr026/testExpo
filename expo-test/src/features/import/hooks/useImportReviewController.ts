import { useEffect, useRef, useState } from "react";

import type { BillType, ImportSuggestion } from "@/database/repositories/types";
import type { DashboardSnapshot } from "@/features/dashboard/services";
import type { ImportPhase } from "@/features/import/importLoadingStatus";
import {
  pickStatementFileOnly,
  readPickedStatementFile,
  type PickedStatementFileResult,
} from "@/features/import/services/StatementFileImport";
import { processPickedStatementFile } from "@/features/import/services/processPickedStatementFile";
import {
  createOverlayDismissalWaiter,
  waitForImportLoadingPaint,
  waitForModalPresentationReady,
  waitForNextReactFrame,
} from "@/features/import/services/waitForOverlayDismissal";
import { parseDollarInputToNonNegativeCents } from "@/shared/currency";
import { getAppRuntime } from "@/shared/services/appRuntime";
import type { PaycheckRecurrence } from "@/shared/ui/types";

import { getTodayIsoDate } from "@/features/app/homeData";
import {
  getDefaultImportBillDueDate,
  getDefaultImportIncomeExpectedDate,
  getImportBillCycle,
} from "@/features/import/importBillCycle";
import { inferDefaultIncomeIsPrimary } from "@/features/import/importIncomeDefaults";

type UseImportReviewControllerInput = {
  dashboardSnapshot: DashboardSnapshot | null;
  onFinancialDataChanged?: () => void | Promise<void>;
  profileId?: string;
};

export function useImportReviewController({
  dashboardSnapshot,
  onFinancialDataChanged,
  profileId,
}: UseImportReviewControllerInput) {
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [confirmAmount, setConfirmAmount] = useState("");
  const [confirmDueDate, setConfirmDueDate] = useState(getTodayIsoDate());
  const [confirmError, setConfirmError] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [confirmRecurrence, setConfirmRecurrence] =
    useState<PaycheckRecurrence>("none");
  const [confirmIsPrimary, setConfirmIsPrimary] = useState(true);
  const [confirmBillType, setConfirmBillType] = useState<BillType>("fixed");
  const [confirmingSuggestion, setConfirmingSuggestion] =
    useState<ImportSuggestion | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPhase, setImportPhase] = useState<ImportPhase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ImportSuggestion[]>([]);
  const [isFilePickerActive, setIsFilePickerActive] = useState(false);
  const onboardingOverlayDismissalRef = useRef(createOverlayDismissalWaiter());

  useEffect(() => {
    let isActive = true;

    async function loadSuggestions() {
      if (!profileId) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const runtime = await getAppRuntime();
        const pendingSuggestions =
          await runtime.services.importService.getPendingSuggestions(profileId);

        if (isActive) {
          setSuggestions(pendingSuggestions);
          setError("");
        }
      } catch {
        if (isActive) {
          setError("Import suggestions could not be loaded.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadSuggestions();

    return () => {
      isActive = false;
    };
  }, [profileId]);

  async function importFile() {
    if (!profileId) {
      setError("A profile is required before importing statement data.");
      return;
    }

    await runStatementImport(async () => {
      await waitForImportLoadingPaint();
      setImportPhase("reading");

      const pickedFile = await pickStatementFileOnly();

      if (pickedFile.canceled) {
        return pickedFile;
      }

      await waitForImportLoadingPaint();
      return readPickedStatementFile(pickedFile.file);
    });
  }

  async function runStatementImport(
    pickFile: () => Promise<PickedStatementFileResult>
  ) {
    try {
      setIsImporting(true);
      setImportPhase("reading");
      setError("");
      await waitForImportLoadingPaint();
      const pickedFile = await pickFile();

      if (pickedFile.canceled) {
        return;
      }

      setImportPhase("analyzing");
      await waitForImportLoadingPaint();
      await applyImportedStatementFile(pickedFile);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Statement file could not be imported."
      );
    } finally {
      setIsImporting(false);
      setImportPhase(null);
    }
  }

  async function applyImportedStatementFile(
    pickedFile: Exclude<PickedStatementFileResult, { canceled: true }>
  ) {
    if (!profileId) {
      setError("A profile is required before importing statement data.");
      return;
    }

    if (pickedFile.fileKind === "pdf" && !pickedFile.pdfText.trim()) {
      setError(
        "This PDF did not include readable statement text. Try exporting the statement as CSV or a text-based PDF."
      );
      setImportMessage("");
      return;
    }

    const runtime = await getAppRuntime();
    const result = await processPickedStatementFile({
      importService: runtime.services.importService,
      pickedFile,
      profileId,
    });

    setSuggestions(result.suggestions);
    setImportMessage(result.importMessage);
    setError("");
  }

  async function importStatementFileForOnboarding() {
    if (!profileId) {
      setError("A profile is required before importing statement data.");
      return;
    }

    try {
      setIsImporting(true);
      setError("");
      setImportPhase("preparing");
      await waitForImportLoadingPaint();
      onboardingOverlayDismissalRef.current.reset();
      await waitForNextReactFrame();
      setIsFilePickerActive(true);
      await waitForNextReactFrame();
      await onboardingOverlayDismissalRef.current.waitForDismissal();
      await waitForModalPresentationReady();

      const pickedFile = await pickStatementFileOnly();
      setIsFilePickerActive(false);

      if (pickedFile.canceled) {
        return;
      }

      await waitForImportLoadingPaint();
      setImportPhase("reading");
      const readFile = await readPickedStatementFile(pickedFile.file);

      setImportPhase("analyzing");
      await waitForImportLoadingPaint();
      await applyImportedStatementFile(readFile);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Statement file could not be imported."
      );
    } finally {
      setIsImporting(false);
      setImportPhase(null);
      setIsFilePickerActive(false);
    }
  }

  function notifyOnboardingOverlayDismissed() {
    onboardingOverlayDismissalRef.current.notifyDismissed();
  }

  function openConfirmSuggestion(suggestion: ImportSuggestion) {
    const today = getTodayIsoDate();

    setConfirmingSuggestion(suggestion);
    setConfirmName(suggestion.suggestedName);
    setConfirmAmount((suggestion.suggestedAmountCents / 100).toFixed(2));
    setConfirmDueDate(
      suggestion.suggestionKind === "income"
        ? getDefaultImportIncomeExpectedDate({
            detectedInterval: suggestion.detectedInterval,
            suggestedDate: suggestion.suggestedDate,
            today,
          })
        : getDefaultImportBillDueDate({
            detectedInterval: suggestion.detectedInterval,
            suggestedDate: suggestion.suggestedDate,
            today,
          })
    );
    setConfirmRecurrence(mapImportIntervalToPaycheckRecurrence(suggestion.detectedInterval));
    setConfirmIsPrimary(
      suggestion.suggestionKind === "income"
        ? inferDefaultIncomeIsPrimary(suggestion)
        : true
    );
    setConfirmBillType("fixed");
    setConfirmError("");
  }

  function closeConfirmSuggestion() {
    setConfirmingSuggestion(null);
    setConfirmError("");
    setConfirmRecurrence("none");
    setConfirmIsPrimary(true);
    setConfirmBillType("fixed");
  }

  async function saveConfirmedSuggestion() {
    if (!confirmingSuggestion) {
      return;
    }

    const amountCents = parseDollarInputToNonNegativeCents(confirmAmount);
    const normalizedName = confirmName.trim();
    const isIncomeSuggestion = confirmingSuggestion.suggestionKind === "income";

    if (!normalizedName) {
      setConfirmError(isIncomeSuggestion ? "Income source is required." : "Bill name is required.");
      return;
    }

    if (!confirmDueDate.trim()) {
      setConfirmError(isIncomeSuggestion ? "Pay date is required." : "Due date is required.");
      return;
    }

    if (amountCents == null) {
      setConfirmError("Use a valid dollar amount.");
      return;
    }

    try {
      setIsConfirming(true);
      const runtime = await getAppRuntime();

      if (isIncomeSuggestion) {
        await runtime.services.importService.confirmSuggestionAsIncome(
          confirmingSuggestion.id,
          {
            amountCents,
            expectedDate: confirmDueDate,
            isPrimary: confirmIsPrimary,
            label: normalizedName,
            recurrenceInterval:
              confirmRecurrence === "none" ? null : confirmRecurrence,
          }
        );
      } else {
        await runtime.services.importService.confirmSuggestionAsBill(
          confirmingSuggestion.id,
          {
            billType: confirmBillType,
            cycle: getImportBillCycle(dashboardSnapshot),
            dueDateAbsolute: confirmDueDate,
            name: normalizedName,
            suggestedAmountCents: amountCents,
          }
        );
      }
      setSuggestions((currentSuggestions) =>
        currentSuggestions.filter(
          (suggestion) => suggestion.id !== confirmingSuggestion.id
        )
      );
      setImportMessage(
        confirmingSuggestion.suggestionKind === "income"
          ? `${normalizedName} was saved as income.`
          : `${normalizedName} was saved as a bill.`
      );
      await onFinancialDataChanged?.();
      closeConfirmSuggestion();
    } catch {
      setConfirmError(
        isIncomeSuggestion
          ? "Imported income could not be saved."
          : "Imported bill could not be saved."
      );
    } finally {
      setIsConfirming(false);
    }
  }

  async function rejectSuggestion(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.importService.rejectSuggestion(id);
      setSuggestions((currentSuggestions) =>
        currentSuggestions.filter((suggestion) => suggestion.id !== id)
      );
      setError("");
      setImportMessage("");
    } catch {
      setError("Import suggestion could not be rejected.");
    }
  }

  async function rejectAllPendingSuggestions() {
    if (!profileId || suggestions.length === 0) {
      return;
    }

    try {
      setIsClearing(true);
      const runtime = await getAppRuntime();

      await runtime.services.importService.clearPendingSuggestions(profileId);
      setSuggestions([]);
      setError("");
      setImportMessage("");
    } catch {
      setError("Import suggestions could not be dismissed.");
    } finally {
      setIsClearing(false);
    }
  }

  async function clearSuggestions() {
    if (!profileId) {
      setError("A profile is required before clearing import suggestions.");
      return;
    }

    try {
      setIsClearing(true);
      const runtime = await getAppRuntime();

      await runtime.services.importService.clearPendingSuggestions(profileId);
      setSuggestions([]);
      setError("");
      setImportMessage("Import suggestions cleared. You can import the file again.");
    } catch {
      setError("Import suggestions could not be cleared.");
    } finally {
      setIsClearing(false);
    }
  }

  async function rejectConfirmingSuggestion() {
    if (!confirmingSuggestion) {
      return;
    }

    await rejectSuggestion(confirmingSuggestion.id);
    closeConfirmSuggestion();
  }

  return {
    confirmSuggestion: {
      amount: confirmAmount,
      billType: confirmBillType,
      close: closeConfirmSuggestion,
      dueDate: confirmDueDate,
      error: confirmError,
      isPrimary: confirmIsPrimary,
      isSaving: isConfirming,
      recurrence: confirmRecurrence,
      suggestionKind: confirmingSuggestion?.suggestionKind ?? "bill",
      name: confirmName,
      reject: rejectConfirmingSuggestion,
      save: saveConfirmedSuggestion,
      setAmount: setConfirmAmount,
      setBillType: setConfirmBillType,
      setDueDate: setConfirmDueDate,
      setIsPrimary: setConfirmIsPrimary,
      setName: setConfirmName,
      setRecurrence: setConfirmRecurrence,
      visible: !!confirmingSuggestion,
    },
    clearSuggestions,
    error,
    importFile,
    importMessage,
    importPhase,
    importStatementFileForOnboarding,
    isClearing,
    isFilePickerActive,
    isImporting,
    isLoading,
    notifyOnboardingOverlayDismissed,
    openConfirmSuggestion,
    rejectAllPendingSuggestions,
    rejectSuggestion,
    suggestions,
  };
}

function mapImportIntervalToPaycheckRecurrence(
  interval: ImportSuggestion["detectedInterval"]
): PaycheckRecurrence {
  switch (interval) {
    case "weekly":
    case "biweekly":
    case "monthly":
      return interval;
    case "quarterly":
    case "irregular":
      return "none";
  }
}
