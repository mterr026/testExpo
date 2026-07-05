import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

import { colors } from "./styles";

export type ActionIconName =
  | "checkmark"
  | "clock"
  | "dollar"
  | "pause"
  | "pencil"
  | "play"
  | "trash"
  | "undo";

const actionIcons: Record<
  ActionIconName,
  ComponentProps<typeof SymbolView>["name"]
> = {
  checkmark: { ios: "checkmark", android: "check", web: "check" },
  clock: { ios: "clock", android: "schedule", web: "schedule" },
  dollar: {
    ios: "dollarsign.circle",
    android: "attach_money",
    web: "attach_money",
  },
  pause: { ios: "pause.fill", android: "pause", web: "pause" },
  pencil: { ios: "pencil", android: "edit", web: "edit" },
  play: { ios: "play.fill", android: "play_arrow", web: "play_arrow" },
  trash: { ios: "trash", android: "delete", web: "delete" },
  undo: {
    ios: "arrow.uturn.backward",
    android: "undo",
    web: "undo",
  },
};

export function ActionIcon({
  color = colors.accentDark,
  destructive = false,
  name,
  size = 20,
}: {
  color?: string;
  destructive?: boolean;
  name: ActionIconName;
  size?: number;
}) {
  return (
    <SymbolView
      name={actionIcons[name]}
      size={size}
      tintColor={destructive ? colors.warningText : color}
    />
  );
}
