import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

type PurchaseRowGestureContextValue = {
  setRowTouchActive: (active: boolean) => void;
};

const PurchaseRowGestureContext =
  createContext<PurchaseRowGestureContextValue | null>(null);

type PurchaseRowGestureProviderProps = PropsWithChildren<{
  onRowTouchActiveChange: (active: boolean) => void;
}>;

export function PurchaseRowGestureProvider({
  children,
  onRowTouchActiveChange,
}: PurchaseRowGestureProviderProps) {
  const value = useMemo(
    () => ({ setRowTouchActive: onRowTouchActiveChange }),
    [onRowTouchActiveChange]
  );

  return (
    <PurchaseRowGestureContext.Provider value={value}>
      {children}
    </PurchaseRowGestureContext.Provider>
  );
}

export function usePurchaseRowGesture() {
  return useContext(PurchaseRowGestureContext)?.setRowTouchActive;
}
