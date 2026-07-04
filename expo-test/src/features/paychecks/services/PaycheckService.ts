import type {
  ActivityLogRepository,
  PaycheckRepository,
} from "@/database/repositories";
import type {
  NewPaycheck,
  Paycheck,
  PaycheckChanges,
  PaycheckCycleAssignment,
  PaycheckRecurrenceInterval,
} from "@/database/repositories/types";
import { generateUpcomingPaycheckDates, findNextDistinctPaycheck, findNextDistinctPaycheckDate, resolvePaycheckCycleWindow } from "@/engine";
import { formatCurrency } from "@/shared/currency";
import {
  FINANCIAL_STATE_CHANGED,
  type FinancialEventBus,
} from "@/shared/events/financialEvents";

import {
  readSpawnedNextPaycheckId,
  withSpawnedNextPaycheckId,
} from "../spawnedPaycheckTracking";

export class PaycheckService {
  constructor(
    private readonly paycheckRepository: PaycheckRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly eventBus: FinancialEventBus
  ) {}

  async createPaycheck(input: NewPaycheck): Promise<Paycheck> {
    const paycheck = await this.paycheckRepository.create(input);
    const generatedPaychecks = await this.createGeneratedRecurringPaychecks(
      input
    );

    await this.activityLogRepository.create({
      profileId: paycheck.profileId,
      eventType: "paycheck_added",
      entityType: "paycheck",
      entityId: paycheck.id,
      summary:
        generatedPaychecks.length > 0
          ? `Added paycheck series: ${formatCurrency(paycheck.amountCents)}`
          : `Added paycheck: ${formatCurrency(paycheck.amountCents)}`,
    });
    this.emitFinancialStateChanged(paycheck.profileId);

    return paycheck;
  }

  async updatePaycheck(
    id: string,
    changes: PaycheckChanges
  ): Promise<Paycheck> {
    const current = await this.paycheckRepository.findById(id);

    if (!current) {
      throw new Error(`Paycheck ${id} not found.`);
    }

    const seriesPaychecks =
      current.isRecurring && current.recurrenceInterval
        ? await this.findRecurringSeriesPaychecks(current)
        : [];

    const paycheck = await this.paycheckRepository.update(id, changes);

    if (seriesPaychecks.length > 0) {
      await this.syncRecurringSeriesAfterEdit(
        current,
        paycheck,
        changes,
        seriesPaychecks
      );
    } else if (paycheck.isRecurring && paycheck.recurrenceInterval) {
      await this.createGeneratedRecurringPaychecks({
        profileId: paycheck.profileId,
        label: paycheck.label,
        amountCents: paycheck.amountCents,
        expectedDate: paycheck.expectedDate,
        isPrimary: paycheck.isPrimary,
        isReceived: paycheck.isReceived,
        isRecurring: paycheck.isRecurring,
        recurrenceInterval: paycheck.recurrenceInterval,
        notes: paycheck.notes,
      });
    }

    await this.activityLogRepository.create({
      profileId: paycheck.profileId,
      eventType: "paycheck_adjusted",
      entityType: "paycheck",
      entityId: paycheck.id,
      summary: `Updated paycheck: ${formatCurrency(paycheck.amountCents)}`,
    });
    this.emitFinancialStateChanged(paycheck.profileId);

    return paycheck;
  }

  async markPaycheckReceived(id: string): Promise<Paycheck> {
    let paycheck = await this.paycheckRepository.markReceived(id);
    const spawnedPaycheck = await this.createNextRecurringPaycheckAfterReceived(
      paycheck
    );

    if (spawnedPaycheck) {
      paycheck = await this.paycheckRepository.update(id, {
        notes: withSpawnedNextPaycheckId(paycheck.notes, spawnedPaycheck.id),
      });
    }

    await this.activityLogRepository.create({
      profileId: paycheck.profileId,
      eventType: "paycheck_confirmed",
      entityType: "paycheck",
      entityId: paycheck.id,
      summary: `Confirmed paycheck: ${formatCurrency(paycheck.amountCents)}`,
    });
    this.emitFinancialStateChanged(paycheck.profileId);

    return paycheck;
  }

  async markPaycheckUnreceived(id: string): Promise<Paycheck> {
    const receivedPaycheck = await this.paycheckRepository.findById(id);

    if (!receivedPaycheck) {
      throw new Error(`Paycheck ${id} not found.`);
    }

    const spawnedNextPaycheckId = readSpawnedNextPaycheckId(
      receivedPaycheck.notes
    );
    let paycheck = await this.paycheckRepository.markUnreceived(id);

    if (spawnedNextPaycheckId) {
      const spawnedPaycheck =
        await this.paycheckRepository.findById(spawnedNextPaycheckId);

      if (spawnedPaycheck && !spawnedPaycheck.isReceived) {
        await this.paycheckRepository.softDelete(spawnedNextPaycheckId);
      }

      paycheck = await this.paycheckRepository.update(id, {
        notes: withSpawnedNextPaycheckId(receivedPaycheck.notes, null),
      });
    } else {
      await this.deleteGeneratedPaycheckAfterUnreceived(
        paycheck,
        receivedPaycheck.receivedAt
      );
    }

    await this.activityLogRepository.create({
      profileId: paycheck.profileId,
      eventType: "paycheck_adjusted",
      entityType: "paycheck",
      entityId: paycheck.id,
      summary: `Marked paycheck expected: ${formatCurrency(paycheck.amountCents)}`,
    });
    this.emitFinancialStateChanged(paycheck.profileId);

    return paycheck;
  }

  async deletePaycheck(id: string): Promise<void> {
    const paycheck = await this.paycheckRepository.findById(id);

    if (!paycheck) {
      throw new Error(`Paycheck ${id} not found.`);
    }

    const deletedPaycheckIds = await this.deletePaycheckOrRecurringSeries(
      paycheck
    );
    await this.activityLogRepository.create({
      profileId: paycheck.profileId,
      eventType: "paycheck_deleted",
      entityType: "paycheck",
      entityId: paycheck.id,
      summary:
        deletedPaycheckIds.length > 1
          ? `Deleted paycheck series: ${formatCurrency(paycheck.amountCents)}`
          : `Deleted paycheck: ${formatCurrency(paycheck.amountCents)}`,
    });
    this.emitFinancialStateChanged(paycheck.profileId);
  }

  async findCycleForDate(
    profileId: string,
    date: string
  ): Promise<PaycheckCycleAssignment | null> {
    const anchors = await this.paycheckRepository.findAll(profileId);

    for (let index = anchors.length - 1; index >= 0; index -= 1) {
      const anchor = anchors[index];
      const cycleBoundary = resolvePaycheckCycleWindow({
        expectedDate: anchor.expectedDate,
        recurrenceInterval: anchor.recurrenceInterval,
        nextPaycheckExpectedDate: findNextDistinctPaycheckDate(anchors, index),
      });

      if (
        anchor.expectedDate <= date &&
        date < cycleBoundary.nextStartDate
      ) {
        return {
          cycleAnchor: anchor,
          nextCycleAnchor: findNextDistinctPaycheck(anchors, index),
        };
      }
    }

    return null;
  }

  private emitFinancialStateChanged(profileId: string) {
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profileId);
  }

  private async createGeneratedRecurringPaychecks(
    input: NewPaycheck
  ) {
    if (!input.isRecurring || !input.recurrenceInterval) {
      return [];
    }

    const generatedDates = generateUpcomingPaycheckDates({
      interval: input.recurrenceInterval,
      startDate: input.expectedDate,
    });
    const generatedPaychecks: Paycheck[] = [];

    for (const expectedDate of generatedDates) {
      generatedPaychecks.push(
        await this.paycheckRepository.create({
          profileId: input.profileId,
          label: input.label,
          amountCents: input.amountCents,
          expectedDate,
          isPrimary: input.isPrimary ?? true,
          isReceived: false,
          isRecurring: true,
          recurrenceInterval: input.recurrenceInterval,
          notes: input.notes,
        })
      );
    }

    return generatedPaychecks;
  }

  private async deletePaycheckOrRecurringSeries(paycheck: Paycheck) {
    if (!paycheck.isRecurring || !paycheck.recurrenceInterval) {
      await this.paycheckRepository.softDelete(paycheck.id);
      return [paycheck.id];
    }

    const seriesPaychecks = await this.findRecurringSeriesPaychecks(paycheck);
    const paycheckIdsToDelete = new Set<string>([paycheck.id]);

    for (const candidate of seriesPaychecks) {
      if (
        !candidate.isReceived &&
        candidate.expectedDate >= paycheck.expectedDate
      ) {
        paycheckIdsToDelete.add(candidate.id);
      }
    }

    for (const paycheckId of paycheckIdsToDelete) {
      await this.paycheckRepository.softDelete(paycheckId);
    }

    return [...paycheckIdsToDelete];
  }

  private async createNextRecurringPaycheckAfterReceived(paycheck: Paycheck) {
    if (!paycheck.isRecurring || !paycheck.recurrenceInterval) {
      return null;
    }

    const seriesPaychecks = await this.findRecurringSeriesPaychecks(paycheck);
    if (seriesPaychecks.length === 0) {
      return null;
    }

    const latestPaycheck = seriesPaychecks.reduce((latest, candidate) =>
      candidate.expectedDate > latest.expectedDate ? candidate : latest
    );
    const [nextExpectedDate] = generateUpcomingPaycheckDates({
      count: 1,
      interval: paycheck.recurrenceInterval,
      startDate: latestPaycheck.expectedDate,
    });

    if (
      seriesPaychecks.some(
        (candidate) => candidate.expectedDate === nextExpectedDate
      )
    ) {
      return null;
    }

    return this.paycheckRepository.create({
      profileId: paycheck.profileId,
      label: paycheck.label,
      amountCents: latestPaycheck.amountCents,
      expectedDate: nextExpectedDate,
      isPrimary: paycheck.isPrimary,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: paycheck.recurrenceInterval,
      notes: latestPaycheck.notes,
    });
  }

  private async deleteGeneratedPaycheckAfterUnreceived(
    paycheck: Paycheck,
    receivedAt: string | null
  ) {
    if (!paycheck.isRecurring || !paycheck.recurrenceInterval) {
      return null;
    }

    const seriesPaychecks = await this.findRecurringSeriesPaychecks(paycheck);
    const futureExpectedPaychecks = seriesPaychecks
      .filter(
        (candidate) =>
          !candidate.isReceived && candidate.expectedDate > paycheck.expectedDate
      )
      .sort((first, second) =>
        first.expectedDate.localeCompare(second.expectedDate)
      );
    const generatedAfterReceivePaychecks = receivedAt
      ? futureExpectedPaychecks.filter(
          (candidate) => candidate.createdAt >= receivedAt
        )
      : [];

    if (generatedAfterReceivePaychecks.length > 0) {
      const latestGeneratedPaycheck =
        generatedAfterReceivePaychecks[generatedAfterReceivePaychecks.length - 1];

      await this.paycheckRepository.softDelete(latestGeneratedPaycheck.id);

      return latestGeneratedPaycheck;
    }

    if (futureExpectedPaychecks.length < 2) {
      return null;
    }

    const latestPaycheck =
      futureExpectedPaychecks[futureExpectedPaychecks.length - 1];
    const previousPaycheck =
      futureExpectedPaychecks[futureExpectedPaychecks.length - 2];
    const [expectedGeneratedDate] = generateUpcomingPaycheckDates({
      count: 1,
      interval: paycheck.recurrenceInterval,
      startDate: previousPaycheck.expectedDate,
    });

    if (latestPaycheck.expectedDate !== expectedGeneratedDate) {
      return null;
    }

    await this.paycheckRepository.softDelete(latestPaycheck.id);

    return latestPaycheck;
  }

  private async findRecurringSeriesPaychecks(paycheck: {
    isPrimary: boolean;
    label: string | null;
    profileId: string;
    recurrenceInterval: PaycheckRecurrenceInterval | null;
  }) {
    if (!paycheck.recurrenceInterval) {
      return [];
    }

    const paychecks =
      (await this.paycheckRepository.findAll(paycheck.profileId)) ?? [];

    return paychecks.filter(
      (candidate) =>
        candidate.isRecurring &&
        candidate.isPrimary === paycheck.isPrimary &&
        candidate.label === paycheck.label &&
        candidate.recurrenceInterval === paycheck.recurrenceInterval
    );
  }

  private async syncRecurringSeriesAfterEdit(
    before: Paycheck,
    after: Paycheck,
    changes: PaycheckChanges,
    seriesPaychecks: Paycheck[]
  ) {
    const scheduleChanged =
      (changes.recurrenceInterval !== undefined &&
        changes.recurrenceInterval !== before.recurrenceInterval) ||
      (changes.expectedDate !== undefined &&
        changes.expectedDate !== before.expectedDate) ||
      (changes.isRecurring !== undefined &&
        changes.isRecurring !== before.isRecurring);

    const seriesFieldsChanged =
      (changes.label !== undefined && changes.label !== before.label) ||
      (changes.amountCents !== undefined &&
        changes.amountCents !== before.amountCents) ||
      (changes.isPrimary !== undefined && changes.isPrimary !== before.isPrimary) ||
      (changes.notes !== undefined && changes.notes !== before.notes);

    const otherFutureUnreceived = seriesPaychecks
      .filter(
        (candidate) =>
          candidate.id !== after.id &&
          !candidate.isReceived &&
          candidate.expectedDate >= before.expectedDate
      )
      .sort((first, second) =>
        first.expectedDate.localeCompare(second.expectedDate)
      );

    if (scheduleChanged) {
      if (!after.isRecurring || !after.recurrenceInterval) {
        for (const candidate of otherFutureUnreceived) {
          await this.paycheckRepository.softDelete(candidate.id);
        }

        return;
      }

      const rescheduledDates = generateUpcomingPaycheckDates({
        count: otherFutureUnreceived.length,
        interval: after.recurrenceInterval,
        startDate: after.expectedDate,
      });

      for (let index = 0; index < otherFutureUnreceived.length; index += 1) {
        await this.paycheckRepository.update(otherFutureUnreceived[index].id, {
          expectedDate: rescheduledDates[index],
          recurrenceInterval: after.recurrenceInterval,
          isRecurring: true,
          ...(seriesFieldsChanged
            ? {
                label: after.label,
                amountCents: after.amountCents,
                isPrimary: after.isPrimary,
                notes: after.notes,
              }
            : {}),
        });
      }

      return;
    }

    if (!seriesFieldsChanged || !after.isRecurring) {
      return;
    }

    for (const candidate of otherFutureUnreceived) {
      await this.paycheckRepository.update(candidate.id, {
        ...(changes.label !== undefined ? { label: after.label } : {}),
        ...(changes.amountCents !== undefined
          ? { amountCents: after.amountCents }
          : {}),
        ...(changes.isPrimary !== undefined ? { isPrimary: after.isPrimary } : {}),
        ...(changes.notes !== undefined ? { notes: after.notes } : {}),
      });
    }
  }
}
