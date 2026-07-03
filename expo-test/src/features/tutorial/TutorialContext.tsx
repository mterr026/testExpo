import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import type { LayoutRectangle, ScrollView, View } from "react-native";
import { Dimensions } from "react-native";

import type { Screen } from "@/shared/ui/types";

import type { TutorialTargetId } from "./tutorialTargets";

type TargetEntry = {
  ref: RefObject<View | null>;
};

type ScrollEntry = {
  ref: RefObject<ScrollView | null>;
  scrollY: number;
};

type TutorialContextValue = {
  registerTarget: (id: TutorialTargetId, ref: RefObject<View | null>) => void;
  unregisterTarget: (id: TutorialTargetId) => void;
  registerScrollView: (
    screen: Screen,
    ref: RefObject<ScrollView | null>
  ) => void;
  unregisterScrollView: (screen: Screen) => void;
  setScrollOffset: (screen: Screen, offsetY: number) => void;
  measureTarget: (id: TutorialTargetId) => Promise<LayoutRectangle | null>;
  scrollTargetIntoView: (
    id: TutorialTargetId,
    screen: Screen
  ) => Promise<void>;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

const VISIBLE_TOP_INSET = 112;
const VISIBLE_BOTTOM_INSET = 220;

function measureViewInWindow(
  ref: RefObject<View | null>
): Promise<LayoutRectangle | null> {
  return new Promise((resolve) => {
    const node = ref.current;

    if (!node) {
      resolve(null);
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        resolve(null);
        return;
      }

      resolve({ x, y, width, height });
    });
  });
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const targetsRef = useRef(new Map<TutorialTargetId, TargetEntry>());
  const scrollViewsRef = useRef(new Map<Screen, ScrollEntry>());

  const registerTarget = useCallback(
    (id: TutorialTargetId, ref: RefObject<View | null>) => {
      targetsRef.current.set(id, { ref });
    },
    []
  );

  const unregisterTarget = useCallback((id: TutorialTargetId) => {
    targetsRef.current.delete(id);
  }, []);

  const registerScrollView = useCallback(
    (screen: Screen, ref: RefObject<ScrollView | null>) => {
      const existing = scrollViewsRef.current.get(screen);

      scrollViewsRef.current.set(screen, {
        ref,
        scrollY: existing?.scrollY ?? 0,
      });
    },
    []
  );

  const unregisterScrollView = useCallback((screen: Screen) => {
    scrollViewsRef.current.delete(screen);
  }, []);

  const setScrollOffset = useCallback((screen: Screen, offsetY: number) => {
    const entry = scrollViewsRef.current.get(screen);

    if (!entry) {
      return;
    }

    scrollViewsRef.current.set(screen, {
      ...entry,
      scrollY: offsetY,
    });
  }, []);

  const measureTarget = useCallback(async (id: TutorialTargetId) => {
    const entry = targetsRef.current.get(id);

    if (!entry) {
      return null;
    }

    return measureViewInWindow(entry.ref);
  }, []);

  const scrollTargetIntoView = useCallback(
    async (id: TutorialTargetId, screen: Screen, attempt = 0) => {
      const targetEntry = targetsRef.current.get(id);
      const scrollEntry = scrollViewsRef.current.get(screen);

      if (!targetEntry?.ref.current || !scrollEntry?.ref.current) {
        return;
      }

      const layout = await measureViewInWindow(targetEntry.ref);

      if (!layout) {
        return;
      }

      const windowHeight = Dimensions.get("window").height;
      const isFullyVisible =
        layout.y >= VISIBLE_TOP_INSET &&
        layout.y + layout.height <= windowHeight - VISIBLE_BOTTOM_INSET;

      if (isFullyVisible || attempt >= 4) {
        return;
      }

      const targetCenter = layout.y + layout.height / 2;
      const desiredCenter = windowHeight * 0.42;
      const delta = targetCenter - desiredCenter;
      const nextOffset = Math.max(0, scrollEntry.scrollY + delta);

      scrollEntry.ref.current.scrollTo({
        y: nextOffset,
        animated: attempt === 0,
      });

      scrollViewsRef.current.set(screen, {
        ...scrollEntry,
        scrollY: nextOffset,
      });

      await new Promise((resolve) => {
        setTimeout(resolve, attempt === 0 ? 320 : 180);
      });

      await scrollTargetIntoView(id, screen, attempt + 1);
    },
    []
  );

  const value = useMemo(
    () => ({
      registerTarget,
      unregisterTarget,
      registerScrollView,
      unregisterScrollView,
      setScrollOffset,
      measureTarget,
      scrollTargetIntoView,
    }),
    [
      measureTarget,
      registerScrollView,
      registerTarget,
      scrollTargetIntoView,
      setScrollOffset,
      unregisterScrollView,
      unregisterTarget,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const context = useContext(TutorialContext);

  if (!context) {
    throw new Error("useTutorialContext must be used within TutorialProvider");
  }

  return context;
}

export function useOptionalTutorialContext() {
  return useContext(TutorialContext);
}
