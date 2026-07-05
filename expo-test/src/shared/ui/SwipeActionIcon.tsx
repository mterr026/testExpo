import { ActionIcon, type ActionIconName } from "./ActionIcon";
import { useTheme } from "./ThemeContext";

export function SwipeActionIcon({
  destructive = false,
  name,
}: {
  destructive?: boolean;
  name: ActionIconName;
}) {
  const { colors } = useTheme();

  return (
    <ActionIcon
      color={colors.onAccent}
      destructive={destructive}
      name={name}
      size={22}
    />
  );
}
