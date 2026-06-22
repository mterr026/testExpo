import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/navigation/BottomNav";
import { KeyboardDoneAccessory } from "@/shared/ui/components";
import { settingsMoneyAccessoryId } from "@/shared/ui/keyboard";
import { spacing, styles } from "@/shared/ui/styles";

import { HomeFloatingActionButton } from "./components/HomeFloatingActionButton";
import { HomeHeader } from "./components/HomeHeader";
import { HomeModals } from "./components/HomeModals";
import { HomePager } from "./components/HomePager";
import type { HomeScreenController } from "./useHomeScreenController";
import { useHomePager } from "./useHomePager";

export function HomeScreen({ controller }: { controller: HomeScreenController }) {
  const insets = useSafeAreaInsets();
  const {
    changeScreen,
    handlePagerScrollEnd,
    pagerRef,
    screen,
    width,
  } = useHomePager();

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
      <HomeHeader />
      <HomePager
        controller={controller}
        onChangeScreen={changeScreen}
        onScrollEnd={handlePagerScrollEnd}
        pagerRef={pagerRef}
        width={width}
      />
      <HomeModals controller={controller} />
      <HomeFloatingActionButton
        bottomInset={insets.bottom}
        onPress={controller.openAddPurchase}
        screen={screen}
      />
      <BottomNav
        active={screen}
        bottomInset={insets.bottom}
        onChange={changeScreen}
      />
      <KeyboardDoneAccessory nativeID={settingsMoneyAccessoryId} />
    </View>
  );
}
