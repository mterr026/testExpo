import type { Screen } from "@/shared/ui/types";

import type { TutorialTargetId } from "./tutorialTargets";

export type TutorialTooltipPlacement = "above" | "below" | "auto";

export type TutorialStep = {
  screen: Screen;
  targetId: TutorialTargetId;
  title: string;
  body: string;
  placement?: TutorialTooltipPlacement;
};

export const tutorialSteps: TutorialStep[] = [
  {
    screen: "Dashboard",
    targetId: "dashboard-safe-to-spend",
    title: "Safe to Spend is your guide",
    body: "This is what you can spend this paycheck cycle after bills, purchases, and your essential reserve.",
    placement: "below",
  },
  {
    screen: "Dashboard",
    targetId: "dashboard-breakdown",
    title: "See how the number is built",
    body: "Income, purchases, paid bills, upcoming bills, and reserve roll up into Safe to Spend.",
    placement: "above",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-summary",
    title: "Paycheck cycle at a glance",
    body: "Next paycheck, received income, and upcoming deposits for this cycle.",
    placement: "below",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-add",
    title: "Add and edit paychecks",
    body: "Tap + Add for a new paycheck. Use the ⋯ menu on any row to edit, confirm received, or delete.",
    placement: "below",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-schedule",
    title: "Paycheck breakdown",
    body: "Expand a paycheck to see starting Safe to Spend, bills in that cycle, and how income covers them.",
    placement: "below",
  },
  {
    screen: "Bills",
    targetId: "bills-add",
    title: "Add bills",
    body: "Tap + Add for fixed or variable bills. Set recurrence so they appear each cycle.",
    placement: "below",
  },
  {
    screen: "Bills",
    targetId: "bills-due",
    title: "Upcoming and due bills",
    body: "Bills due this cycle appear here. Open ⋯ to mark paid, confirm a variable amount, edit, or pause.",
    placement: "below",
  },
  {
    screen: "Purchases",
    targetId: "purchases-summary",
    title: "Spending this cycle",
    body: "Total spent, pending charges, and transaction count for the active paycheck window.",
    placement: "below",
  },
  {
    screen: "Purchases",
    targetId: "purchases-filters",
    title: "Pending vs charged",
    body: "Filter the list by status. Use ⋯ on a row to edit, mark pending/charged, or delete.",
    placement: "below",
  },
  {
    screen: "Dashboard",
    targetId: "dashboard-fab",
    title: "Log a purchase quickly",
    body: "From Dashboard, tap + to add a purchase without leaving your overview.",
    placement: "above",
  },
  {
    screen: "Settings",
    targetId: "settings-money",
    title: "Essential reserve",
    body: "Money held back from Safe to Spend for essentials. Update it here anytime.",
    placement: "below",
  },
  {
    screen: "Settings",
    targetId: "settings-preferences",
    title: "Reminders and backup",
    body: "Turn on bill reminders and export a local JSON backup when you want a copy of your data.",
    placement: "above",
  },
];
