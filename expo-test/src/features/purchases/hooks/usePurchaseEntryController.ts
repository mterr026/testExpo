import { useState } from "react";

import { parseDollarInputToCents } from "@/shared/currency";
import type { Purchase } from "@/shared/ui/types";
import { getAppRuntime } from "@/shared/services/appRuntime";

import { getOrCreateActiveProfile } from "@/shared/services/activeProfile";
import { getTodayIsoDate } from "@/shared/dates";

const DEFAULT_PURCHASE_DESCRIPTION = "Purchase";

export type PurchaseEntryPrefill = {
  amountCents?: number;
  description?: string;
};

type UsePurchaseEntryControllerInput = {
  envelopesEnabled?: boolean;
  onPurchasesChanged?: () => void | Promise<void>;
};

export function usePurchaseEntryController({
  envelopesEnabled = false,
  onPurchasesChanged,
}: UsePurchaseEntryControllerInput = {}) {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getTodayIsoDate());
  const [purchaseStatus, setPurchaseStatus] =
    useState<Purchase["status"]>("Charged");
  const [purchaseEnvelopeId, setPurchaseEnvelopeId] = useState<string | null>(
    null
  );
  const [purchaseError, setPurchaseError] = useState("");
  const [addFormResetKey, setAddFormResetKey] = useState(0);

  async function savePurchase(options: { addAnother?: boolean } = {}) {
    const amountCents = parseDollarInputToCents(purchaseAmount);
    const description = purchaseName.trim() || DEFAULT_PURCHASE_DESCRIPTION;

    if (amountCents === null) {
      setPurchaseError("Enter an amount above $0.");
      return;
    }

    if (!isIsoDate(purchaseDate)) {
      setPurchaseError("Choose a valid purchase date.");
      return;
    }

    try {
      const runtime = await getAppRuntime();
      const state = purchaseStatus === "Pending" ? "pending" : "charged";

      const envelopeId = purchaseEnvelopeId;

      if (editingPurchase) {
        await runtime.services.purchaseService.updatePurchase(editingPurchase.id, {
          amountCents,
          description,
          purchaseDate,
          state,
          envelopeId,
        });
        closePurchaseModal();
      } else {
        const profile = await getOrCreateActiveProfile(runtime);

        await runtime.services.purchaseService.createPurchase({
          profileId: profile.id,
          amountCents,
          state,
          description,
          purchaseDate,
          envelopeId,
        });

        if (options.addAnother) {
          resetAddForm();
          setAddFormResetKey((key) => key + 1);
        } else {
          closePurchaseModal();
        }
      }

      await onPurchasesChanged?.();
    } catch {
      setPurchaseError("Purchase could not be saved.");
    }
  }

  function resetAddForm(prefill?: PurchaseEntryPrefill) {
    setEditingPurchase(null);
    setPurchaseName(prefill?.description ?? "");
    setPurchaseAmount(
      prefill?.amountCents != null
        ? (prefill.amountCents / 100).toFixed(2)
        : ""
    );
    setPurchaseDate(getTodayIsoDate());
    setPurchaseStatus("Charged");
    setPurchaseEnvelopeId(null);
    setPurchaseError("");
  }

  function closePurchaseModal() {
    resetAddForm();
    setPurchaseModalOpen(false);
  }

  function openAddPurchase(prefill?: PurchaseEntryPrefill) {
    resetAddForm(prefill);
    setPurchaseModalOpen(true);
  }

  function openAddPurchaseWithPrefill(prefill?: PurchaseEntryPrefill) {
    openAddPurchase(prefill);
  }

  function openPurchaseEdit(purchase: Purchase) {
    setEditingPurchase(purchase);
    setPurchaseName(purchase.name);
    setPurchaseAmount((purchase.amountCents / 100).toFixed(2));
    setPurchaseDate(purchase.purchaseDate);
    setPurchaseStatus(purchase.status);
    setPurchaseEnvelopeId(purchase.envelopeId);
    setPurchaseError("");
    setPurchaseModalOpen(true);
  }

  async function deletePurchase(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.purchaseService.deletePurchase(id);
      await onPurchasesChanged?.();
    } catch {
      setPurchaseError("Purchase could not be deleted.");
    }
  }

  async function markPurchaseCharged(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.purchaseService.markPurchaseCharged(id);
      await onPurchasesChanged?.();
    } catch {
      setPurchaseError("Purchase could not be marked charged.");
    }
  }

  async function markPurchasePending(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.purchaseService.markPurchasePending(id);
      await onPurchasesChanged?.();
    } catch {
      setPurchaseError("Purchase could not be marked pending.");
    }
  }

  return {
    deletePurchase,
    markPurchaseCharged,
    markPurchasePending,
    openAddPurchase,
    openAddPurchaseWithPrefill,
    openPurchaseEdit,
    purchaseEntry: {
      addFormResetKey,
      amount: purchaseAmount,
      close: closePurchaseModal,
      error: purchaseError,
      date: purchaseDate,
      mode: editingPurchase ? "edit" as const : "add" as const,
      name: purchaseName,
      save: () => savePurchase(),
      saveAndAddAnother: () => savePurchase({ addAnother: true }),
      setAmount: (text: string) => {
        setPurchaseAmount(text);
        setPurchaseError("");
      },
      setDate: (date: string) => {
        setPurchaseDate(date);
        setPurchaseError("");
      },
      setName: (text: string) => {
        setPurchaseName(text);
        setPurchaseError("");
      },
      setStatus: (status: Purchase["status"]) => {
        setPurchaseStatus(status);
        setPurchaseError("");
      },
      setEnvelopeId: (envelopeId: string | null) => {
        setPurchaseEnvelopeId(envelopeId);
        setPurchaseError("");
      },
      envelopeId: purchaseEnvelopeId,
      status: purchaseStatus,
      visible: purchaseModalOpen,
    },
  };
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
