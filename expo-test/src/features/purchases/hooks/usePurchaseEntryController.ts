import { useState } from "react";

import { parseDollarInputToCents } from "@/shared/currency";
import type { Purchase } from "@/shared/ui/types";
import { getAppRuntime } from "@/shared/services/appRuntime";

import { getOrCreateActiveProfile, getTodayIsoDate } from "@/features/app/homeData";

type UsePurchaseEntryControllerInput = {
  onPurchasesChanged?: () => void | Promise<void>;
};

export function usePurchaseEntryController({
  onPurchasesChanged,
}: UsePurchaseEntryControllerInput = {}) {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getTodayIsoDate());
  const [purchaseStatus, setPurchaseStatus] =
    useState<Purchase["status"]>("Pending");
  const [purchaseError, setPurchaseError] = useState("");

  async function savePurchase() {
    const amountCents = parseDollarInputToCents(purchaseAmount);

    if (!purchaseName.trim() || amountCents === null) {
      setPurchaseError("Enter a description and an amount above $0.");
      return;
    }

    if (!isIsoDate(purchaseDate)) {
      setPurchaseError("Choose a valid purchase date.");
      return;
    }

    try {
      const runtime = await getAppRuntime();
      const state = purchaseStatus === "Pending" ? "pending" : "charged";

      if (editingPurchase) {
        await runtime.services.purchaseService.updatePurchase(editingPurchase.id, {
          amountCents,
          description: purchaseName.trim(),
          purchaseDate,
          state,
        });
      } else {
        const profile = await getOrCreateActiveProfile(runtime);

        await runtime.services.purchaseService.createPurchase({
          profileId: profile.id,
          amountCents,
          state,
          description: purchaseName.trim(),
          purchaseDate,
        });
      }
      closePurchaseModal();
      await onPurchasesChanged?.();
    } catch {
      setPurchaseError("Purchase could not be saved.");
    }
  }

  function closePurchaseModal() {
    setEditingPurchase(null);
    setPurchaseName("");
    setPurchaseAmount("");
    setPurchaseDate(getTodayIsoDate());
    setPurchaseStatus("Pending");
    setPurchaseError("");
    setPurchaseModalOpen(false);
  }

  function openAddPurchase() {
    setEditingPurchase(null);
    setPurchaseName("");
    setPurchaseAmount("");
    setPurchaseDate(getTodayIsoDate());
    setPurchaseStatus("Pending");
    setPurchaseError("");
    setPurchaseModalOpen(true);
  }

  function openPurchaseEdit(purchase: Purchase) {
    setEditingPurchase(purchase);
    setPurchaseName(purchase.name);
    setPurchaseAmount((purchase.amountCents / 100).toFixed(2));
    setPurchaseDate(purchase.purchaseDate);
    setPurchaseStatus(purchase.status);
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
    openPurchaseEdit,
    purchaseEntry: {
      amount: purchaseAmount,
      close: closePurchaseModal,
      error: purchaseError,
      date: purchaseDate,
      mode: editingPurchase ? "edit" as const : "add" as const,
      name: purchaseName,
      save: savePurchase,
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
      status: purchaseStatus,
      visible: purchaseModalOpen,
    },
  };
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
