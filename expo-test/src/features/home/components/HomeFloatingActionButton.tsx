import { SymbolView } from "expo-symbols";
import { Pressable } from "react-native";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { spacing, styles } from "@/shared/ui/styles";
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
  if (screen !== "Dashboard") {
    return null;
  }

  return (
    <TutorialTarget
      id="dashboard-fab"
      style={[styles.fab, { bottom: bottomInset + spacing.xxxl * 3 + spacing.md }]}
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
          tintColor="white"
          size={26}
        />
      </Pressable>
    </TutorialTarget>
  );
}
