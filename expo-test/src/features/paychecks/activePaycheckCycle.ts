import type { Paycheck } from "@/database/repositories/types";
import {
  OPEN_ENDED_PAYCHECK_CYCLE_DATE,
  resolvePaycheckCycleWindow,
} from "@/engine";

export type ActivePaycheckCycle = {
  cycleAnchor: Paycheck | null;
  nextCycleAnchor: Paycheck | null;
  nextStartDate: string;
  paycheckCycleId: string;
  startDate: string;
};

export function findActivePaycheckCycle(
  paychecks: Paycheck[],
  date: string
): ActivePaycheckCycle | null {
  const cyclePaychecks = paychecksForCycleAnchor(paychecks);
  const sortedPaychecks = [...cyclePaychecks].sort((first, second) =>
    first.expectedDate.localeCompare(second.expectedDate)
  );

  if (sortedPaychecks.length === 0) {
    return null;
  }

  const nextExpectedPaycheck = sortedPaychecks.find(
    (paycheck) => !paycheck.isReceived && paycheck.expectedDate >= date
  );
  const latestReceivedPaycheck = [...sortedPaychecks]
    .reverse()
    .find((paycheck) => paycheck.isReceived && paycheck.expectedDate <= date);

  if (latestReceivedPaycheck) {
    const nextExpectedAfterReceived = sortedPaychecks.find(
      (paycheck) =>
        !paycheck.isReceived &&
        paycheck.expectedDate > latestReceivedPaycheck.expectedDate
    );
    const boundary = resolvePaycheckCycleWindow({
      expectedDate: latestReceivedPaycheck.expectedDate,
      recurrenceInterval: latestReceivedPaycheck.recurrenceInterval,
      nextPaycheckExpectedDate: nextExpectedAfterReceived?.expectedDate ?? null,
    });

    if (date >= boundary.nextStartDate) {
      const overdueUnreceived = [...sortedPaychecks]
        .reverse()
        .find(
          (paycheck) =>
            !paycheck.isReceived &&
            paycheck.expectedDate > latestReceivedPaycheck.expectedDate &&
            paycheck.expectedDate <= date
        );

      if (overdueUnreceived) {
        const nextUnreceivedAfterOverdue = sortedPaychecks.find(
          (paycheck) =>
            !paycheck.isReceived &&
            paycheck.expectedDate > overdueUnreceived.expectedDate
        );

        return {
          cycleAnchor: overdueUnreceived,
          nextCycleAnchor: nextUnreceivedAfterOverdue ?? null,
          nextStartDate: resolvePaycheckCycleWindow({
            expectedDate: overdueUnreceived.expectedDate,
            recurrenceInterval: overdueUnreceived.recurrenceInterval,
            nextPaycheckExpectedDate: nextUnreceivedAfterOverdue?.expectedDate ?? null,
          }).nextStartDate,
          paycheckCycleId: overdueUnreceived.id,
          startDate: overdueUnreceived.expectedDate,
        };
      }

      return {
        cycleAnchor: latestReceivedPaycheck,
        nextCycleAnchor: nextExpectedAfterReceived ?? null,
        nextStartDate: OPEN_ENDED_PAYCHECK_CYCLE_DATE,
        paycheckCycleId: latestReceivedPaycheck.id,
        startDate: latestReceivedPaycheck.expectedDate,
      };
    }

    return {
      cycleAnchor: latestReceivedPaycheck,
      nextCycleAnchor: nextExpectedAfterReceived ?? null,
      nextStartDate: boundary.nextStartDate,
      paycheckCycleId: latestReceivedPaycheck.id,
      startDate: latestReceivedPaycheck.expectedDate,
    };
  }

  const overdueUnreceivedPaycheck = [...sortedPaychecks]
    .reverse()
    .find(
      (paycheck) => !paycheck.isReceived && paycheck.expectedDate < date
    );

  if (overdueUnreceivedPaycheck) {
    const nextUnreceivedAfterOverdue = sortedPaychecks.find(
      (paycheck) =>
        !paycheck.isReceived &&
        paycheck.expectedDate > overdueUnreceivedPaycheck.expectedDate
    );

    return {
      cycleAnchor: overdueUnreceivedPaycheck,
      nextCycleAnchor: nextUnreceivedAfterOverdue ?? null,
      nextStartDate: resolvePaycheckCycleWindow({
        expectedDate: overdueUnreceivedPaycheck.expectedDate,
        recurrenceInterval: overdueUnreceivedPaycheck.recurrenceInterval,
        nextPaycheckExpectedDate: nextUnreceivedAfterOverdue?.expectedDate ?? null,
      }).nextStartDate,
      paycheckCycleId: overdueUnreceivedPaycheck.id,
      startDate: overdueUnreceivedPaycheck.expectedDate,
    };
  }

  if (!nextExpectedPaycheck) {
    return null;
  }

  const nextCycleAnchor =
    nextExpectedPaycheck.expectedDate === date
      ? sortedPaychecks.find(
          (paycheck) =>
            !paycheck.isReceived &&
            paycheck.expectedDate > nextExpectedPaycheck.expectedDate
        ) ?? null
      : nextExpectedPaycheck;

  const isPaydayAnchor = nextExpectedPaycheck.expectedDate === date;

  return {
    cycleAnchor: isPaydayAnchor ? nextExpectedPaycheck : null,
    nextCycleAnchor,
    nextStartDate: isPaydayAnchor
      ? resolvePaycheckCycleWindow({
          expectedDate: nextExpectedPaycheck.expectedDate,
          recurrenceInterval: nextExpectedPaycheck.recurrenceInterval,
          nextPaycheckExpectedDate: nextCycleAnchor?.expectedDate ?? null,
        }).nextStartDate
      : (nextCycleAnchor?.expectedDate ?? OPEN_ENDED_PAYCHECK_CYCLE_DATE),
    paycheckCycleId: nextExpectedPaycheck.id,
    startDate: isPaydayAnchor ? nextExpectedPaycheck.expectedDate : date,
  };
}

function paychecksForCycleAnchor(paychecks: Paycheck[]) {
  const primaryPaychecks = paychecks.filter((paycheck) => paycheck.isPrimary);

  return primaryPaychecks.length > 0 ? primaryPaychecks : paychecks;
}
