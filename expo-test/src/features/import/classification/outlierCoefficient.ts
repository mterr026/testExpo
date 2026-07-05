import type { TransactionCategory } from "./categoryVocabulary";

export type OutlierTransaction = {
  amountCents: number;
  category: TransactionCategory;
  date: string;
  normalizedDescription: string;
  type: "credit" | "debit" | "unknown";
};

const STRUCTURAL_CATEGORIES = new Set<TransactionCategory>([
  "credit_card_payment",
  "government_benefit",
  "installment",
  "insurance",
  "loan",
  "mortgage",
  "payroll_income",
  "phone_internet",
  "rent",
  "retirement_income",
  "subscription",
  "utility",
]);

const ORDINARY_SPENDING_CATEGORIES = new Set<TransactionCategory>([
  "convenience_store",
  "entertainment",
  "gas",
  "grocery",
  "misc_purchase",
  "personal_care",
  "restaurant",
  "retail",
  "travel",
]);

const REVIEW_HEAVY_CATEGORIES = new Set<TransactionCategory>([
  "atm",
  "cash_app",
  "check",
  "deposit",
  "fee",
  "tax_payment",
  "transfer",
  "transfer_received",
  "transfer_sent",
  "unknown",
  "unknown_credit",
  "venmo",
  "zelle",
]);

export function calculateOutlierCoefficient(
  transaction: OutlierTransaction,
  transactions: readonly OutlierTransaction[]
) {
  const comparableTransactions = transactions.filter(
    (candidate) =>
      candidate.type === transaction.type &&
      candidate.normalizedDescription === transaction.normalizedDescription
  );
  const directionTransactions = transactions.filter(
    (candidate) => candidate.type === transaction.type
  );
  let score = 50;

  if (comparableTransactions.length >= 3) {
    score -= 30;
  } else if (comparableTransactions.length === 2) {
    score -= 15;
  } else {
    score += 12;
  }

  if (hasSimilarAmountPattern(transaction, comparableTransactions)) {
    score -= 20;
  } else if (comparableTransactions.length > 1) {
    score += 8;
  }

  if (hasRecurringDatePattern(comparableTransactions)) {
    score -= 18;
  }

  if (STRUCTURAL_CATEGORIES.has(transaction.category)) {
    score -= 12;
  }

  if (
    STRUCTURAL_CATEGORIES.has(transaction.category) &&
    comparableTransactions.length === 1
  ) {
    score -= 10;
  }

  if (REVIEW_HEAVY_CATEGORIES.has(transaction.category)) {
    score += 24;
  }

  if (
    ORDINARY_SPENDING_CATEGORIES.has(transaction.category) &&
    comparableTransactions.length === 1
  ) {
    score += 16;
  }

  if (
    transaction.amountCents >= getPercentileAmount(directionTransactions, 0.9) &&
    comparableTransactions.length === 1
  ) {
    score += 18;
  }

  return clampOutlierCoefficient(score);
}

function hasSimilarAmountPattern(
  transaction: OutlierTransaction,
  transactions: OutlierTransaction[]
) {
  if (transactions.length < 2) {
    return false;
  }

  return (
    transactions.filter((candidate) =>
      areSimilarAmounts(candidate.amountCents, transaction.amountCents)
    ).length > 1
  );
}

function hasRecurringDatePattern(transactions: OutlierTransaction[]) {
  if (transactions.length < 2) {
    return false;
  }

  const sortedDates = transactions
    .map((transaction) => transaction.date)
    .sort();
  const gaps = sortedDates
    .slice(1)
    .map((date, index) => daysBetween(sortedDates[index], date));

  return gaps.some(
    (gap) =>
      isNear(gap, 7, 2) ||
      isNear(gap, 14, 3) ||
      isNear(gap, 15, 3) ||
      isNear(gap, 30, 5)
  );
}

function getPercentileAmount(
  transactions: OutlierTransaction[],
  percentile: number
) {
  if (transactions.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const amounts = transactions
    .map((transaction) => transaction.amountCents)
    .sort((first, second) => first - second);
  const index = Math.min(
    amounts.length - 1,
    Math.max(0, Math.floor(amounts.length * percentile))
  );

  return amounts[index];
}

function areSimilarAmounts(firstAmount: number, secondAmount: number) {
  const tolerance = Math.max(100, Math.round(Math.max(firstAmount, secondAmount) * 0.03));

  return Math.abs(firstAmount - secondAmount) <= tolerance;
}

function daysBetween(firstDate: string, secondDate: string) {
  const first = new Date(`${firstDate}T00:00:00Z`).getTime();
  const second = new Date(`${secondDate}T00:00:00Z`).getTime();

  return Math.round((second - first) / 86_400_000);
}

function isNear(value: number, target: number, tolerance: number) {
  return Math.abs(value - target) <= tolerance;
}

function clampOutlierCoefficient(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
