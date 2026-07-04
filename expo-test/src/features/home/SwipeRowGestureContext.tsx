import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

type SwipeRowGestureContextValue = {
  setRowTouchActive: (active: boolean) => void;
};

const SwipeRowGestureContext = createContext<SwipeRowGestureContextValue | null>(
  null
);

type SwipeRowGestureProviderProps = PropsWithChildren<{
  onRowTouchActiveChange: (active: boolean) => void;
}>;

export function SwipeRowGestureProvider({
  children,
  onRowTouchActiveChange,
}: SwipeRowGestureProviderProps) {
  const value = useMemo(
    () => ({ setRowTouchActive: onRowTouchActiveChange }),
    [onRowTouchActiveChange]
  );

  return (
    <SwipeRowGestureContext.Provider value={value}>
      {children}
    </SwipeRowGestureContext.Provider>
  );
}

export function useSwipeRowGesture() {
  return useContext(SwipeRowGestureContext)?.setRowTouchActive;
}
