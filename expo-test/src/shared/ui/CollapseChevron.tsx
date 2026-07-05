import { SymbolView } from "expo-symbols";

import { useTheme } from "./ThemeContext";

export function CollapseChevron({
  color,
  expanded,
  size = 14,
}: {
  color?: string;
  expanded: boolean;
  size?: number;
}) {
  const { colors } = useTheme();

  return (
    <SymbolView
      name={
        expanded
          ? { ios: "chevron.up", android: "expand_less", web: "expand_less" }
          : {
              ios: "chevron.down",
              android: "expand_more",
              web: "expand_more",
            }
      }
      size={size}
      tintColor={color ?? colors.muted}
    />
  );
}
