import { SymbolView } from "expo-symbols";
import { Pressable } from "react-native";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { getFabBottom } from "@/shared/ui/styles";
import { useStyles, useTheme } from "@/shared/ui/ThemeContext";
import type { Screen } from "@/shared/ui/types";

type HomeFloatingActionButtonProps = {
  bottomInset: number;
  onPress: () => void;
  screen: Screen;
};

export function HomeFloatingActionButton({
  bottomInset,
  onPress,
  screen,
}: HomeFloatingActionButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (screen !== "Dashboard" && screen !== "Purchases") {
    return null;
  }

  return (
    <TutorialTarget
      id="dashboard-fab"
      style={[styles.fab, { bottom: getFabBottom(bottomInset) }]}
    >
      <Pressable
        accessibilityLabel="Add purchase"
        style={({ pressed }) => [
          styles.fabPressable,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        <SymbolView
          name={{ ios: "plus", android: "add", web: "add" }}
          tintColor={colors.onAccent}
          size={26}
        />
      </Pressable>
    </TutorialTarget>
  );
}
