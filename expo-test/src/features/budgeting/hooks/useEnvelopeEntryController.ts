import { useState } from "react";

import type { Envelope } from "@/database/repositories/types";
import { parseDollarInputToNonNegativeCents } from "@/shared/currency";
import { getAppRuntime } from "@/shared/services/appRuntime";

import { getOrCreateActiveProfile } from "@/shared/services/activeProfile";

type UseEnvelopeEntryControllerInput = {
  envelopes: Envelope[];
  onEnvelopesChanged?: () => void | Promise<void>;
};

export function useEnvelopeEntryController({
  envelopes,
  onEnvelopesChanged,
}: UseEnvelopeEntryControllerInput) {
  const [envelopeModalOpen, setEnvelopeModalOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [envelopeName, setEnvelopeName] = useState("");
  const [envelopeAllocation, setEnvelopeAllocation] = useState("");
  const [envelopePaused, setEnvelopePaused] = useState(false);
  const [envelopeError, setEnvelopeError] = useState("");

  async function saveEnvelope() {
    const allocationCents = parseDollarInputToNonNegativeCents(envelopeAllocation);

    if (!envelopeName.trim()) {
      setEnvelopeError("Enter an envelope name.");
      return;
    }

    if (allocationCents === null) {
      setEnvelopeError("Enter a valid allocation amount.");
      return;
    }

    try {
      const runtime = await getAppRuntime();
      const profile = await getOrCreateActiveProfile(runtime);

      if (editingEnvelope) {
        await runtime.services.envelopeService.update(editingEnvelope.id, {
          name: envelopeName.trim(),
          allocationCents,
          isPaused: envelopePaused,
        });
      } else {
        await runtime.services.envelopeService.create({
          profileId: profile.id,
          name: envelopeName.trim(),
          allocationCents,
          sortOrder: envelopes.length,
        });
      }

      await onEnvelopesChanged?.();
      closeEnvelopeModal();
    } catch {
      setEnvelopeError("Envelope could not be saved.");
    }
  }

  async function deleteEnvelope(id: string) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.envelopeService.softDelete(id);
      await onEnvelopesChanged?.();
    } catch {
      setEnvelopeError("Envelope could not be deleted.");
    }
  }

  async function toggleEnvelopePaused(envelope: Envelope) {
    try {
      const runtime = await getAppRuntime();

      await runtime.services.envelopeService.update(envelope.id, {
        isPaused: !envelope.isPaused,
      });
      await onEnvelopesChanged?.();
    } catch {
      setEnvelopeError("Envelope could not be updated.");
    }
  }

  function closeEnvelopeModal() {
    setEditingEnvelope(null);
    setEnvelopeName("");
    setEnvelopeAllocation("");
    setEnvelopePaused(false);
    setEnvelopeError("");
    setEnvelopeModalOpen(false);
  }

  function openAddEnvelope() {
    setEditingEnvelope(null);
    setEnvelopeName("");
    setEnvelopeAllocation("");
    setEnvelopePaused(false);
    setEnvelopeError("");
    setEnvelopeModalOpen(true);
  }

  function openEnvelopeEdit(envelope: Envelope) {
    setEditingEnvelope(envelope);
    setEnvelopeName(envelope.name);
    setEnvelopeAllocation((envelope.allocationCents / 100).toFixed(2));
    setEnvelopePaused(envelope.isPaused);
    setEnvelopeError("");
    setEnvelopeModalOpen(true);
  }

  return {
    deleteEnvelope,
    envelopeEntry: {
      allocation: envelopeAllocation,
      close: closeEnvelopeModal,
      error: envelopeError,
      isPaused: envelopePaused,
      mode: editingEnvelope ? ("edit" as const) : ("add" as const),
      name: envelopeName,
      save: saveEnvelope,
      setAllocation: (text: string) => {
        setEnvelopeAllocation(text);
        setEnvelopeError("");
      },
      setIsPaused: (isPaused: boolean) => {
        setEnvelopePaused(isPaused);
        setEnvelopeError("");
      },
      setName: (text: string) => {
        setEnvelopeName(text);
        setEnvelopeError("");
      },
      visible: envelopeModalOpen,
    },
    openAddEnvelope,
    openEnvelopeEdit,
    toggleEnvelopePaused,
  };
}
