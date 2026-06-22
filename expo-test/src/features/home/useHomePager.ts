import { useEffect, useRef, useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { Screen } from "@/shared/ui/types";

import { screenOrder } from "@/features/app/homeData";

export function useHomePager() {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [screen, setScreen] = useState<Screen>("Dashboard");

  useEffect(() => {
    const index = screenOrder.indexOf(screen);
    pagerRef.current?.scrollTo({ x: index * width, animated: false });
  }, [screen, width]);

  function changeScreen(nextScreen: Screen) {
    const index = screenOrder.indexOf(nextScreen);

    setScreen(nextScreen);
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
  }

  function handlePagerScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    const nextScreen = screenOrder[index];

    if (nextScreen) {
      setScreen(nextScreen);
    }
  }

  return {
    changeScreen,
    handlePagerScrollEnd,
    pagerRef,
    screen,
    width,
  };
}
