export const tutorialTargetIds = [
  "dashboard-safe-to-spend",
  "dashboard-breakdown",
  "dashboard-fab",
  "paychecks-summary",
  "paychecks-add",
  "paychecks-schedule",
  "bills-add",
  "bills-due",
  "purchases-summary",
  "purchases-filters",
  "settings-money",
  "settings-preferences",
] as const;

export type TutorialTargetId = (typeof tutorialTargetIds)[number];
