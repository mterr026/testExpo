export const tutorialTargetIds = [
  "dashboard-safe-to-spend",
  "dashboard-breakdown",
  "dashboard-fab",
  "paychecks-summary",
  "paychecks-upcoming",
  "paychecks-row-overflow",
  "paychecks-coverage-breakdown",
  "paychecks-additional-income",
  "bills-add",
  "bills-due",
  "purchases-summary",
  "purchases-filters",
  "settings-current-balance",
  "settings-essential-reserve",
  "settings-preferences",
] as const;

export type TutorialTargetId = (typeof tutorialTargetIds)[number];
