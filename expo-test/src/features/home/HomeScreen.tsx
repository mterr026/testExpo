import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/navigation/BottomNav";
import { KeyboardDoneAccessory } from "@/shared/ui/components";
import { settingsMoneyAccessoryId } from "@/shared/ui/keyboard";
import { spacing } from "@/shared/ui/styles";
import { useStyles } from "@/shared/ui/ThemeContext";

import { DemoSampleBanner } from "@/features/demo/components/DemoSampleBanner";
import {
  useNotificationNavigation,
  useReminderNotifications,
} from "@/features/notifications/hooks";
import { usePurchaseDeepLink } from "@/features/purchases/hooks";
import { TutorialOverlay } from "@/features/tutorial/TutorialOverlay";
import { TutorialProvider } from "@/features/tutorial/TutorialContext";

import { HomeFloatingActionButton } from "./components/HomeFloatingActionButton";
import { HomeHeader } from "./components/HomeHeader";
import { HomeModals } from "./components/HomeModals";
import { HomePager } from "./components/HomePager";
import { useHomeScreenController } from "./useHomeScreenController";
import { useHomePager } from "./useHomePager";

export function HomeScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const {
    changeScreen,
    handlePagerScrollEnd,
    pagerRef,
    screen,
    width,
  } = useHomePager();
  const controller = useHomeScreenController({ changeScreen });
  const { clearNotificationTarget, notificationTarget } =
    useNotificationNavigation(changeScreen);

  useReminderNotifications({
    dashboardSnapshot: controller.dashboardSnapshot,
    notificationsEnabled:
      controller.notificationSettings?.notificationsEnabled,
  });

  usePurchaseDeepLink({
    onOpenAddPurchase: controller.openAddPurchaseWithPrefill,
  });

  return (
    <TutorialProvider
      activeTargetId={
        controller.tutorial.visible
          ? (controller.tutorial.currentStep?.targetId ?? null)
          : null
      }
    >
      <View style={[styles.page, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
        <HomeHeader />
        <DemoSampleBanner
          visible={controller.demoPreview.isDemoExploring}
          isFinishing={controller.demoPreview.isBusy}
          onSetupPress={controller.demoPreview.finishDemoExplore}
        />
        <HomePager
          controller={controller}
          notificationTarget={notificationTarget}
          onChangeScreen={changeScreen}
          onClearNotificationTarget={clearNotificationTarget}
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
        <TutorialOverlay
          visible={controller.tutorial.visible}
          stepIndex={controller.tutorial.stepIndex}
          steps={controller.tutorial.steps}
          isSaving={controller.tutorial.isSaving}
          onBack={controller.tutorial.previousTutorialStep}
          onNext={controller.tutorial.nextTutorialStep}
          onSkip={controller.tutorial.skipTutorial}
        />
      </View>
    </TutorialProvider>
  );
}
