import { useEffect, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

import type { Screen } from "@/shared/ui/types";

import { useOptionalTutorialContext } from "../TutorialContext";

export function useTutorialScrollView(screen: Screen) {
  const context = useOptionalTutorialContext();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.registerScrollView(screen, scrollRef);

    return () => {
      context.unregisterScrollView(screen);
    };
  }, [context, screen]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    context?.setScrollOffset(screen, event.nativeEvent.contentOffset.y);
  }

  return {
    onTutorialScroll: handleScroll,
    tutorialScrollRef: scrollRef,
  };
}
