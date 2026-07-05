import { SymbolView } from "expo-symbols";

import { colors } from "./styles";

export function CollapseChevron({
  color = colors.muted,
  expanded,
  size = 14,
}: {
  color?: string;
  expanded: boolean;
  size?: number;
}) {
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
      tintColor={color}
    />
  );
}
