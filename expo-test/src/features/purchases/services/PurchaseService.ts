import type {
  ActivityLogRepository,
  PurchaseRepository,
} from "@/database/repositories";
import type {
  NewPurchase,
  Purchase,
  PurchaseChanges,
} from "@/database/repositories/types";
import { formatCurrency } from "@/shared/currency";
import {
  FINANCIAL_STATE_CHANGED,
  type FinancialEventBus,
} from "@/shared/events/financialEvents";

import type { PaycheckService } from "@/features/paychecks/services/PaycheckService";

export type CreatePurchaseInput = Omit<NewPurchase, "paycheckCycleId">;

export class PurchaseService {
  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly paycheckService: PaycheckService,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly eventBus: FinancialEventBus
  ) {}

  async createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
    const normalizedInput = {
      ...input,
      ...(input.state === "charged" ? { resolvedAt: new Date().toISOString() } : {}),
    };
    const cycle = await this.paycheckService.findCycleForDate(
      normalizedInput.profileId,
      normalizedInput.purchaseDate
    );
    const purchase = await this.purchaseRepository.create({
      ...normalizedInput,
      paycheckCycleId: cycle?.cycleAnchor.id ?? null,
    });

    await this.activityLogRepository.create({
      profileId: normalizedInput.profileId,
      eventType: "purchase_added",
      entityType: "purchase",
      entityId: purchase.id,
      summary: `Added purchase: ${formatCurrency(purchase.amountCents)}`,
    });
    this.emitFinancialStateChanged(input.profileId);

    return purchase;
  }

  async updatePurchase(
    id: string,
    changes: PurchaseChanges
  ): Promise<Purchase> {
    const normalizedChanges = {
      ...changes,
      ...("state" in changes
        ? {
            resolvedAt:
              changes.state === "charged" ? new Date().toISOString() : null,
          }
        : {}),
    };
    const purchase = await this.purchaseRepository.update(id, normalizedChanges);

    await this.activityLogRepository.create({
      profileId: purchase.profileId,
      eventType: "purchase_updated",
      entityType: "purchase",
      entityId: purchase.id,
      summary: `Updated purchase: ${formatCurrency(purchase.amountCents)}`,
    });
    this.emitFinancialStateChanged(purchase.profileId);

    return purchase;
  }

  async markPurchaseCharged(id: string): Promise<Purchase> {
    const purchase = await this.purchaseRepository.markCharged(id);

    await this.activityLogRepository.create({
      profileId: purchase.profileId,
      eventType: "purchase_state_changed",
      entityType: "purchase",
      entityId: purchase.id,
      summary: `Marked purchase charged: ${formatCurrency(purchase.amountCents)}`,
    });
    this.emitFinancialStateChanged(purchase.profileId);

    return purchase;
  }

  async markPurchasePending(id: string): Promise<Purchase> {
    const purchase = await this.purchaseRepository.markPending(id);

    await this.activityLogRepository.create({
      profileId: purchase.profileId,
      eventType: "purchase_state_changed",
      entityType: "purchase",
      entityId: purchase.id,
      summary: `Marked purchase pending: ${formatCurrency(purchase.amountCents)}`,
    });
    this.emitFinancialStateChanged(purchase.profileId);

    return purchase;
  }

  async deletePurchase(id: string): Promise<void> {
    const purchase = await this.purchaseRepository.findById(id);

    if (!purchase) {
      throw new Error(`Purchase ${id} not found.`);
    }

    await this.purchaseRepository.softDelete(id);
    await this.activityLogRepository.create({
      profileId: purchase.profileId,
      eventType: "purchase_deleted",
      entityType: "purchase",
      entityId: purchase.id,
      summary: `Deleted purchase: ${formatCurrency(purchase.amountCents)}`,
    });
    this.emitFinancialStateChanged(purchase.profileId);
  }

  private emitFinancialStateChanged(profileId: string) {
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profileId);
  }
}
