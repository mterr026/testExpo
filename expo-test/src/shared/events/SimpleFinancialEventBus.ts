import type {
  FinancialEventListener,
  FinancialEventName,
  SubscribableFinancialEventBus,
} from "./financialEvents";

export class SimpleFinancialEventBus implements SubscribableFinancialEventBus {
  private readonly listeners = new Map<
    FinancialEventName,
    Set<FinancialEventListener>
  >();

  emit(eventName: FinancialEventName, profileId: string) {
    this.listeners.get(eventName)?.forEach((listener) => listener(profileId));
  }

  subscribe(eventName: FinancialEventName, listener: FinancialEventListener) {
    const listeners = this.listeners.get(eventName) ?? new Set();

    listeners.add(listener);
    this.listeners.set(eventName, listeners);

    return () => {
      listeners.delete(listener);
    };
  }
}
