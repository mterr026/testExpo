import type { TransactionCategory } from "./categoryVocabulary";

export type TransactionDirection = "credit" | "debit" | "unknown";

export type BudgetFlowSuggestionType =
  | "ignored_ordinary_spending"
  | "likely_bill"
  | "likely_income"
  | "needs_review"
  | "possible_bill"
  | "possible_income";

const LIKELY_INCOME_CATEGORIES = new Set<TransactionCategory>([
  "government_benefit",
  "payroll_income",
  "retirement_income",
]);

const POSSIBLE_INCOME_CATEGORIES = new Set<TransactionCategory>([
  "business_income",
  "gig_income",
]);

const REVIEW_CREDIT_CATEGORIES = new Set<TransactionCategory>([
  "deposit",
  "refund",
  "transfer_received",
  "unknown_credit",
]);

const LIKELY_BILL_CATEGORIES = new Set<TransactionCategory>([
  "credit_card_payment",
  "insurance",
  "loan",
  "mortgage",
  "phone_internet",
  "rent",
  "utility",
]);

const POSSIBLE_BILL_CATEGORIES = new Set<TransactionCategory>([
  "installment",
  "medical_payment",
  "subscription",
]);

const ORDINARY_SPENDING_CATEGORIES = new Set<TransactionCategory>([
  "convenience_store",
  "education",
  "entertainment",
  "gas",
  "grocery",
  "misc_purchase",
  "personal_care",
  "restaurant",
  "retail",
  "travel",
]);

const REVIEW_CATEGORIES = new Set<TransactionCategory>([
  "atm",
  "cash_app",
  "check",
  "fee",
  "internal_transfer",
  "tax_payment",
  "transfer",
  "transfer_sent",
  "venmo",
  "zelle",
  "unknown",
]);

export function isStructuralBillCategory(category: TransactionCategory) {
  return LIKELY_BILL_CATEGORIES.has(category);
}

export function isStructuralIncomeCategory(category: TransactionCategory) {
  return LIKELY_INCOME_CATEGORIES.has(category) || category === "retirement_income";
}

export function isPaycheckHeuristicExcludedCategory(category: TransactionCategory) {
  return (
    REVIEW_CREDIT_CATEGORIES.has(category) ||
    category === "refund" ||
    category === "deposit" ||
    ORDINARY_SPENDING_CATEGORIES.has(category) ||
    category === "atm" ||
    category === "cash_app" ||
    category === "check" ||
    category === "fee" ||
    category === "internal_transfer" ||
    category === "tax_payment" ||
    category === "transfer" ||
    category === "transfer_sent" ||
    category === "venmo" ||
    category === "zelle"
  );
}

function hasCategorySignal(
  category: TransactionCategory,
  categoryConfidence: number
) {
  const threshold = isStructuralBillCategory(category) || isStructuralIncomeCategory(category)
    ? 20
    : 30;

  return categoryConfidence >= threshold;
}

export function mapCategoryToSuggestion({
  category,
  categoryConfidence,
  direction,
}: {
  category: TransactionCategory;
  categoryConfidence: number;
  direction: TransactionDirection;
}): BudgetFlowSuggestionType {
  if (direction === "credit") {
    if (LIKELY_INCOME_CATEGORIES.has(category) && hasCategorySignal(category, categoryConfidence)) {
      return "likely_income";
    }

    if (
      category === "retirement_income" &&
      hasCategorySignal(category, categoryConfidence)
    ) {
      return "likely_income";
    }

    if (POSSIBLE_INCOME_CATEGORIES.has(category) && hasCategorySignal(category, categoryConfidence)) {
      return "possible_income";
    }

    if (REVIEW_CREDIT_CATEGORIES.has(category) || REVIEW_CATEGORIES.has(category)) {
      return "needs_review";
    }

    return "needs_review";
  }

  if (direction === "debit") {
    if (category === "credit_card_payment" && hasCategorySignal(category, categoryConfidence)) {
      return "ignored_ordinary_spending";
    }

    if (category === "fee" && hasCategorySignal(category, categoryConfidence)) {
      return "ignored_ordinary_spending";
    }

    if (LIKELY_BILL_CATEGORIES.has(category) && hasCategorySignal(category, categoryConfidence)) {
      return "likely_bill";
    }

    if (POSSIBLE_BILL_CATEGORIES.has(category) && hasCategorySignal(category, categoryConfidence)) {
      return "possible_bill";
    }

    if (ORDINARY_SPENDING_CATEGORIES.has(category)) {
      return "ignored_ordinary_spending";
    }

    if (REVIEW_CATEGORIES.has(category)) {
      return "needs_review";
    }

    return "needs_review";
  }

  return "needs_review";
}

export function isIncomeSuggestion(suggestionType: BudgetFlowSuggestionType) {
  return suggestionType === "likely_income" || suggestionType === "possible_income";
}

export function isBillSuggestion(suggestionType: BudgetFlowSuggestionType) {
  return suggestionType === "likely_bill" || suggestionType === "possible_bill";
}

export function isOrdinarySpendingCategory(category: TransactionCategory) {
  return ORDINARY_SPENDING_CATEGORIES.has(category);
}

export function isIncomeCategory(category: TransactionCategory) {
  return (
    LIKELY_INCOME_CATEGORIES.has(category) ||
    POSSIBLE_INCOME_CATEGORIES.has(category)
  );
}

export function isReviewOnlyCreditCategory(category: TransactionCategory) {
  return REVIEW_CREDIT_CATEGORIES.has(category) || REVIEW_CATEGORIES.has(category);
}
