import type { ImportSuggestionKind } from "@/database/repositories/types";

import type { TransactionCategory } from "./categoryVocabulary";
import { shouldHardIgnoreImportTransaction } from "./importIgnoreRules";
import {
  isIncomeSuggestion,
  isStructuralBillCategory,
  type BudgetFlowSuggestionType,
} from "./suggestionMapper";

const SUBSCRIPTION_INSTALLMENT_THRESHOLD_CENTS = 500;

export type ImportSuggestionFilterCandidate = {
  category: TransactionCategory;
  description: string;
  direction: "credit" | "debit";
  occurrenceCount: number;
  suggestedAmountCents: number;
  suggestedName: string;
  suggestionKind: ImportSuggestionKind;
  suggestionType: BudgetFlowSuggestionType;
};

function hasRecurrenceEvidence(candidate: ImportSuggestionFilterCandidate) {
  if (candidate.occurrenceCount > 1) {
    return true;
  }

  if (/\brecurring\b/i.test(candidate.description)) {
    return true;
  }

  return false;
}

function isExportableBillCandidate(candidate: ImportSuggestionFilterCandidate) {
  if (candidate.suggestionKind !== "bill") {
    return false;
  }

  if (hasRecurrenceEvidence(candidate)) {
    return true;
  }

  if (isStructuralBillCategory(candidate.category)) {
    return true;
  }

  if (
    (candidate.category === "installment" || candidate.category === "subscription") &&
    candidate.suggestedAmountCents >= SUBSCRIPTION_INSTALLMENT_THRESHOLD_CENTS
  ) {
    return true;
  }

  return false;
}

function isExportableIncomeCandidate(candidate: ImportSuggestionFilterCandidate) {
  if (candidate.suggestionKind !== "income") {
    return false;
  }

  if (!isIncomeSuggestion(candidate.suggestionType)) {
    return false;
  }

  if (candidate.category === "transfer_received") {
    return false;
  }

  return true;
}

export function isExportableImportSuggestion(
  candidate: ImportSuggestionFilterCandidate
): boolean {
  if (
    shouldHardIgnoreImportTransaction(candidate.description, candidate.direction) ||
    shouldHardIgnoreImportTransaction(candidate.suggestedName, candidate.direction)
  ) {
    return false;
  }

  if (candidate.suggestionKind === "bill") {
    return isExportableBillCandidate(candidate);
  }

  if (candidate.suggestionKind === "income") {
    return isExportableIncomeCandidate(candidate);
  }

  return false;
}
