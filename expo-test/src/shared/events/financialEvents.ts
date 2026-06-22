export const FINANCIAL_STATE_CHANGED = "FINANCIAL_STATE_CHANGED";

export type FinancialEventName = typeof FINANCIAL_STATE_CHANGED;
export type FinancialEventListener = (profileId: string) => void;
export type FinancialEventUnsubscribe = () => void;

export type FinancialEventBus = {
  emit(eventName: FinancialEventName, profileId: string): void;
};

export type SubscribableFinancialEventBus = FinancialEventBus & {
  subscribe(
    eventName: FinancialEventName,
    listener: FinancialEventListener
  ): FinancialEventUnsubscribe;
};
