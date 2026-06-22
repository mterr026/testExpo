import type { PaycheckListItem } from "@/shared/ui/types";

type PrimaryPaycheckLike = {
  isPrimary: boolean;
};

export function getPrimaryPaychecks<TPaycheck extends PrimaryPaycheckLike>(
  paychecks: TPaycheck[]
) {
  const primaryPaychecks = paychecks.filter((paycheck) => paycheck.isPrimary);

  return primaryPaychecks.length > 0 ? primaryPaychecks : paychecks;
}

export function getAdditionalPaychecks<TPaycheck extends PrimaryPaycheckLike>(
  paychecks: TPaycheck[]
) {
  const primaryPaychecks = paychecks.filter((paycheck) => paycheck.isPrimary);

  if (primaryPaychecks.length === 0) {
    return [] as TPaycheck[];
  }

  return paychecks.filter((paycheck) => !paycheck.isPrimary);
}

export function splitPaycheckSchedule(paychecks: PaycheckListItem[]) {
  const expectedPaychecks = paychecks
    .filter((paycheck) => !paycheck.isReceived)
    .sort((first, second) =>
      first.expectedDate === second.expectedDate
        ? first.label.localeCompare(second.label)
        : first.expectedDate.localeCompare(second.expectedDate)
    );
  const previousPaychecks = paychecks
    .filter((paycheck) => paycheck.isReceived)
    .sort((first, second) =>
      first.expectedDate === second.expectedDate
        ? first.label.localeCompare(second.label)
        : second.expectedDate.localeCompare(first.expectedDate)
    );

  return {
    expectedPaychecks,
    previousPaychecks,
  };
}
