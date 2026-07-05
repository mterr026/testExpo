import type { ActionMenuItem } from "@/shared/ui/components";
import type { Envelope } from "@/database/repositories/types";

type EnvelopeActionHandlers = {
  onDeleteEnvelope: (id: string) => void | Promise<void>;
  onEditEnvelope: (envelope: Envelope) => void;
  onToggleEnvelopePaused: (envelope: Envelope) => void | Promise<void>;
};

export function getEnvelopeSwipeActions({
  envelope,
  onDeleteEnvelope,
  onEditEnvelope,
  onToggleEnvelopePaused,
}: EnvelopeActionHandlers & { envelope: Envelope }): ActionMenuItem[] {
  return [
    {
      icon: envelope.isPaused ? "play" : "pause",
      label: envelope.isPaused ? "Resume envelope" : "Pause envelope",
      onPress: () => {
        void onToggleEnvelopePaused(envelope);
      },
    },
    {
      icon: "pencil",
      label: "Edit Envelope",
      closeBeforeAction: true,
      onPress: () => onEditEnvelope(envelope),
    },
    {
      icon: "trash",
      label: "Delete Envelope",
      destructive: true,
      onPress: () => {
        void onDeleteEnvelope(envelope.id);
      },
    },
  ];
}

export function getEnvelopeSwipeActionLabel(label: string) {
  if (label === "Pause envelope") {
    return "Pause";
  }

  if (label === "Resume envelope") {
    return "Resume";
  }

  if (label === "Edit Envelope") {
    return "Edit";
  }

  if (label === "Delete Envelope") {
    return "Delete";
  }

  return label;
}

export function getEnvelopeSwipeActionStyle(
  destructive: boolean | undefined,
  label: string
) {
  if (destructive) {
    return "destructive" as const;
  }

  if (label === "Pause envelope" || label === "Resume envelope") {
    return "accent" as const;
  }

  return "default" as const;
}
