import type { ImportSuggestion } from "@/database/repositories/types";

import type { StatusPillTone } from "./components";
import type { Bill, Purchase } from "./types";

export type StatusPresentation = {
  label: string;
  tone: StatusPillTone;
};

export function getBillStatusLabel(status: Bill["status"]) {
  switch (status) {
    case "Needs confirmation":
      return "Confirm";
    case "Scheduled":
      return "Scheduled";
    case "Projected":
      return "Projected";
    default:
      return status;
  }
}

export function getBillStatusTone(status: Bill["status"]): StatusPillTone {
  switch (status) {
    case "Due":
      return "accent";
    case "Paid":
      return "warm";
    case "Needs confirmation":
      return "warning";
    case "Paused":
      return "warm";
    case "Scheduled":
      return "muted";
    case "Projected":
      return "muted";
  }
}

export function getBillStatusPresentation(status: Bill["status"]): StatusPresentation {
  return {
    label: getBillStatusLabel(status),
    tone: getBillStatusTone(status),
  };
}

export function getBillTimelineMetaLabel(status: Bill["status"]) {
  switch (status) {
    case "Needs confirmation":
      return "Confirm";
    case "Due":
      return "Due Soon";
    case "Projected":
      return "Projected Bill";
    case "Scheduled":
      return "Upcoming Bill";
    default:
      return status;
  }
}

export function getPurchaseStatusLabel(status: Purchase["status"]) {
  return status;
}

export function getPurchaseStatusTone(status: Purchase["status"]): StatusPillTone {
  switch (status) {
    case "Pending":
      return "warning";
    case "Charged":
      return "warm";
  }
}

export function getPurchaseStatusPresentation(
  status: Purchase["status"]
): StatusPresentation {
  return {
    label: getPurchaseStatusLabel(status),
    tone: getPurchaseStatusTone(status),
  };
}

export function getPaycheckStatusLabel(isReceived: boolean) {
  return isReceived ? "Received" : "Expected";
}

export function getPaycheckStatusTone(isReceived: boolean): StatusPillTone {
  return isReceived ? "warm" : "accent";
}

export function getPaycheckStatusPresentation(isReceived: boolean): StatusPresentation {
  return {
    label: getPaycheckStatusLabel(isReceived),
    tone: getPaycheckStatusTone(isReceived),
  };
}

export function getPaycheckTimelineMetaLabel(isReceived: boolean) {
  return isReceived ? "Received Income" : "Expected Income";
}

export function getImportSuggestionRowPresentation(
  suggestion: ImportSuggestion
): StatusPresentation {
  return {
    label: getImportSuggestionRowLabel(suggestion),
    tone: getImportSuggestionTone(suggestion),
  };
}

export function getImportSuggestionMenuPresentation(
  suggestion: ImportSuggestion
): StatusPresentation {
  return {
    label: getImportSuggestionMenuLabel(suggestion),
    tone: getImportSuggestionTone(suggestion),
  };
}

function getImportSuggestionRowLabel(suggestion: ImportSuggestion) {
  if (suggestion.suggestionKind === "income") {
    return suggestion.detectedInterval === "irregular" ? "Possible Income" : "Income";
  }

  return suggestion.detectedInterval === "irregular" ? "Possible Bill" : "Bill";
}

function getImportSuggestionMenuLabel(suggestion: ImportSuggestion) {
  if (suggestion.suggestionKind === "income") {
    return suggestion.detectedInterval === "irregular" ? "Possible Income" : "Likely Income";
  }

  return suggestion.detectedInterval === "irregular"
    ? "Possible Bill"
    : "Likely Recurring Payment";
}

function getImportSuggestionTone(suggestion: ImportSuggestion): StatusPillTone {
  return suggestion.suggestionKind === "income" ? "accent" : "warning";
}
