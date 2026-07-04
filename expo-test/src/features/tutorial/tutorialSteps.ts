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
    body: "Tap Safe to spend calculation to expand income, purchases, bills, and reserve rolling up into Safe to Spend.",
    placement: "above",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-summary",
    title: "Your next paycheck",
    body: "The hero card shows your next expected deposit, amount, and date. Swipe it like any other paycheck row.",
    placement: "below",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-upcoming",
    title: "Later paychecks",
    body: "Each expected deposit shows its date, amount, and recurrence.",
    placement: "below",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-row-overflow",
    title: "Swipe for paycheck actions",
    body: "Swipe left on a paycheck row for Confirm, Edit, or Delete. Tap See how bills fit to expand the bill breakdown — tap Next to see it open.",
    placement: "below",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-coverage-breakdown",
    title: "Paycheck breakdown",
    body: "This is the expanded view: bills in the window, starting Safe to Spend, and what is projected after that cycle's bills.",
    placement: "below",
  },
  {
    screen: "Paychecks",
    targetId: "paychecks-additional-income",
    title: "Additional income",
    body: "Side gigs, bonuses, and other non-primary deposits live here. They still roll into your cycle without changing the main paycheck schedule.",
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
    targetId: "settings-current-balance",
    title: "Current balance",
    body: "Match this to your bank account so Safe to Spend stays accurate. Update it here whenever you reconcile.",
    placement: "below",
  },
  {
    screen: "Settings",
    targetId: "settings-essential-reserve",
    title: "Essential reserve",
    body: "Money held back from Safe to Spend for essentials. Set it here and adjust anytime your cushion changes.",
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
