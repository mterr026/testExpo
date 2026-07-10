import type { ImportSuggestionKind } from "@/database/repositories/types";
import {
  getCanonicalMerchantToken,
  type TransactionCategory,
} from "@/features/import/classification/categoryVocabulary";
import { shouldHardIgnoreImportTransaction } from "@/features/import/classification/importIgnoreRules";
import { calculateOutlierCoefficient } from "@/features/import/classification/outlierCoefficient";
import { classifyTransactionDescription } from "@/features/import/classification/transactionClassifier";
import {
  isBillSuggestion,
  isIncomeCategory,
  isIncomeSuggestion,
  isOrdinarySpendingCategory,
  isPaycheckHeuristicExcludedCategory,
  isReviewOnlyCreditCategory,
  isStructuralBillCategory,
  isStructuralIncomeCategory,
  mapCategoryToSuggestion,
  type BudgetFlowSuggestionType,
} from "@/features/import/classification/suggestionMapper";
import {
  areSimilarAmounts,
  daysBetween,
  detectInterval,
  isNear,
  isNearCommonBillingDate,
  normalizeDescriptionKey,
} from "./parsingUtils";
import { getTransactionAmount, resolveTransactionDirection } from "./transactions";
import type {
  BankStatementImportResult,
  BankStatementSuggestion,
  ConfidenceResult,
  NormalizedTransaction,
  ScoringContext,
} from "./types";

export function applyTransactionCategoryPredictions(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  const categorizedTransactions = transactions.map((transaction) => {
    const prediction = classifyTransactionDescription(transaction.description);
    const direction = resolveTransactionDirection(transaction);
    const amountCents =
      direction === "credit"
        ? getTransactionAmount(transaction, "credit")
        : getTransactionAmount(transaction, "debit");
    let suggestionType = isPointOfSalePurchaseDescription(transaction.description)
      ? "ignored_ordinary_spending"
      : mapCategoryToSuggestion({
          category: prediction.category,
          categoryConfidence: prediction.confidence,
          direction,
        });

    if (
      shouldHardIgnoreImportTransaction(transaction.description, direction)
    ) {
      suggestionType = "ignored_ordinary_spending";
    }

    return {
      ...transaction,
      amountCents,
      category: prediction.category,
      categoryConfidence: prediction.confidence,
      normalizedDescription: prediction.normalized.normalizedDescription,
      reasons: prediction.reasons,
      suggestionType,
    };
  });

  const withOutlierScores = categorizedTransactions.map((transaction) => {
    const outlierCoefficient = calculateOutlierCoefficient(
      {
        amountCents: transaction.amountCents,
        category: transaction.category,
        date: transaction.date,
        normalizedDescription: transaction.normalizedDescription,
        type: transaction.type,
      },
      categorizedTransactions.map((candidate) => ({
        amountCents: candidate.amountCents,
        category: candidate.category,
        date: candidate.date,
        normalizedDescription: candidate.normalizedDescription,
        type: candidate.type,
      }))
    );
    const adjustedSuggestionType = adjustSuggestionTypeWithBudgetStructure({
      outlierCoefficient,
      transaction,
    });

    return {
      ...transaction,
      outlierCoefficient,
      reasons: [
        ...transaction.reasons,
        `Outlier coefficient ${outlierCoefficient}`,
      ],
      suggestionType: adjustedSuggestionType,
    };
  });

  return applyLargestCreditPaycheckHeuristic(withOutlierScores);
}

function adjustSuggestionTypeWithBudgetStructure({
  outlierCoefficient,
  transaction,
}: {
  outlierCoefficient: number;
  transaction: NormalizedTransaction;
}): BudgetFlowSuggestionType {
  if (transaction.type === "debit" && transaction.category === "tax_payment") {
    return "needs_review";
  }

  if (transaction.type === "debit" && transaction.category === "fee") {
    return "ignored_ordinary_spending";
  }

  if (
    transaction.type === "debit" &&
    transaction.suggestionType === "likely_bill" &&
    outlierCoefficient >= 85 &&
    !isStructuralBillCategory(transaction.category)
  ) {
    return "needs_review";
  }

  if (
    transaction.type === "debit" &&
    transaction.suggestionType === "likely_bill" &&
    outlierCoefficient >= 70 &&
    !isStructuralBillCategory(transaction.category)
  ) {
    return "possible_bill";
  }

  if (
    transaction.type === "credit" &&
    transaction.suggestionType === "likely_income" &&
    outlierCoefficient >= 85 &&
    !isStructuralIncomeCategory(transaction.category)
  ) {
    return "possible_income";
  }

  if (
    transaction.type === "debit" &&
    transaction.suggestionType === "needs_review" &&
    isStructuralBillCategory(transaction.category) &&
    transaction.categoryConfidence >= 20
  ) {
    return "likely_bill";
  }

  if (
    transaction.type === "debit" &&
    transaction.suggestionType === "needs_review" &&
    transaction.category === "subscription" &&
    transaction.categoryConfidence >= 20
  ) {
    return "possible_bill";
  }

  if (
    transaction.type === "credit" &&
    transaction.suggestionType === "needs_review" &&
    isStructuralIncomeCategory(transaction.category) &&
    transaction.categoryConfidence >= 20
  ) {
    return "likely_income";
  }

  return transaction.suggestionType;
}

const MIN_PAYCHECK_HEURISTIC_CENTS = 50_000;

function applyLargestCreditPaycheckHeuristic(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  const credits = transactions.filter(
    (transaction) =>
      transaction.creditCents != null && transaction.type !== "debit"
  );
  const creditAmountsAscending = credits
    .map((transaction) => getTransactionAmount(transaction, "credit"))
    .sort((first, second) => first - second);
  const paycheckCandidates = credits
    .filter((transaction) => isPaycheckHeuristicCandidate(transaction, creditAmountsAscending))
    .sort(
      (first, second) =>
        getTransactionAmount(second, "credit") - getTransactionAmount(first, "credit")
    );
  const primaryPaycheck = paycheckCandidates[0] ?? null;
  const secondaryPaycheck = paycheckCandidates[1] ?? null;

  if (!primaryPaycheck) {
    return transactions;
  }

  return transactions.map((transaction) => {
    if (transaction.description === primaryPaycheck.description) {
      return boostPaycheckCandidate(transaction, "likely_income");
    }

    if (
      secondaryPaycheck &&
      transaction.description === secondaryPaycheck.description
    ) {
      return boostPaycheckCandidate(transaction, "possible_income");
    }

    return transaction;
  });
}

function isPaycheckHeuristicCandidate(
  transaction: NormalizedTransaction,
  creditAmountsAscending: number[]
) {
  if (transaction.creditCents == null || transaction.type === "debit") {
    return false;
  }

  if (transaction.suggestionType !== "needs_review") {
    return false;
  }

  if (!hasPaycheckDescriptionSignal(transaction.description)) {
    return false;
  }

  if (isIncomeSuggestion(transaction.suggestionType)) {
    return false;
  }

  if (isPaycheckHeuristicExcludedCategory(transaction.category)) {
    return false;
  }

  if (isIgnoredCreditDescription(transaction.description)) {
    return false;
  }

  if (isLikelyOrdinarySpendingDescription(transaction.description)) {
    return false;
  }

  const amountCents = getTransactionAmount(transaction, "credit");

  return (
    amountCents >= MIN_PAYCHECK_HEURISTIC_CENTS &&
    isTopQuartileAmount(amountCents, creditAmountsAscending)
  );
}

function boostPaycheckCandidate(
  transaction: NormalizedTransaction,
  suggestionType: BudgetFlowSuggestionType
) {
  if (isIncomeSuggestion(transaction.suggestionType)) {
    return transaction;
  }

  if (transaction.suggestionType !== "needs_review") {
    return transaction;
  }

  return {
    ...transaction,
    type: transaction.type === "unknown" ? "credit" : transaction.type,
    category:
      transaction.category === "unknown" ? "payroll_income" : transaction.category,
    suggestionType,
    reasons: [
      ...transaction.reasons,
      "Largest credit on the statement resembles a paycheck",
    ],
  };
}

export function classifySuggestions(
  transactions: NormalizedTransaction[],
  includeSingleOccurrenceCandidates: boolean
): BankStatementImportResult["suggestions"] {
  const context = createScoringContext(transactions);
  const groupedTransactions = groupTransactionsForSuggestion(transactions);
  const likelyBills: BankStatementSuggestion[] = [];
  const likelyIncome: BankStatementSuggestion[] = [];
  const needsReview: BankStatementSuggestion[] = [];
  const possibleBills: BankStatementSuggestion[] = [];
  const possibleIncome: BankStatementSuggestion[] = [];
  const reviewSuggested: BankStatementSuggestion[] = [];
  const ignoredOrdinarySpending: NormalizedTransaction[] = [];

  for (const group of groupedTransactions) {
    const latestTransaction = [...group].sort((first, second) =>
      first.date.localeCompare(second.date)
    )[group.length - 1];

    if (latestTransaction.suggestionType === "ignored_ordinary_spending") {
      ignoredOrdinarySpending.push(
        classifyTransaction(latestTransaction, {
          classification: "ignored_ordinary_spending",
          confidence: latestTransaction.categoryConfidence,
          reasons: latestTransaction.reasons,
        })
      );
      continue;
    }

    if (group.length === 1 && !includeSingleOccurrenceCandidates) {
      continue;
    }

    if (resolveTransactionDirection(latestTransaction) === "credit") {
      const incomeConfidence = buildIncomeConfidence(group, context);

      if (!isIncomeSuggestion(latestTransaction.suggestionType)) {
        const suggestion = createSuggestion(group, "income", {
          reasons: [
            ...latestTransaction.reasons,
            ...incomeConfidence.reasons,
            "Credit category requires review before creating income",
          ],
          score: Math.min(incomeConfidence.score, 55),
        });

        needsReview.push(suggestion);

        if (shouldSurfaceCreditReview(group)) {
          reviewSuggested.push(suggestion);
        }

        continue;
      }

      const suggestion = createSuggestion(group, "income", incomeConfidence);

      if (latestTransaction.suggestionType === "likely_income") {
        likelyIncome.push(suggestion);
        possibleIncome.push(suggestion);
      } else if (latestTransaction.suggestionType === "possible_income") {
        possibleIncome.push(suggestion);
      }

      continue;
    }

    if (resolveTransactionDirection(latestTransaction) !== "debit") {
      continue;
    }

    if (!isBillSuggestion(latestTransaction.suggestionType)) {
      const billConfidence = buildBillConfidence(group, context);
      const suggestion = createSuggestion(group, "bill", {
        reasons: [
          ...latestTransaction.reasons,
          ...billConfidence.reasons,
          "Debit category requires review before creating a bill",
        ],
        score: Math.min(billConfidence.score, 55),
      });

      needsReview.push(suggestion);

      if (shouldSurfaceDebitReview(group)) {
        reviewSuggested.push(suggestion);
      }

      continue;
    }

    const billConfidence = buildBillConfidence(group, context);
    const suggestion = createSuggestion(group, "bill", billConfidence);

    if (latestTransaction.suggestionType === "likely_bill") {
      likelyBills.push(suggestion);
      possibleBills.push(suggestion);
    } else if (latestTransaction.suggestionType === "possible_bill") {
      possibleBills.push(suggestion);
    }
  }

  return {
    ignoredOrdinarySpending,
    likelyBills: sortSuggestions(likelyBills),
    likelyIncome: sortSuggestions(likelyIncome),
    needsReview: sortSuggestions(needsReview),
    possibleBills: sortSuggestions(possibleBills),
    possibleIncome: sortSuggestions(possibleIncome),
    reviewSuggested: sortSuggestions(reviewSuggested),
  };
}

function groupTransactionsForSuggestion(transactions: NormalizedTransaction[]) {
  const grouped = new Map<string, NormalizedTransaction[]>();

  for (const transaction of transactions) {
    const direction = resolveTransactionDirection(transaction);

    if (direction === "unknown") {
      continue;
    }

    const descriptionKey = normalizeDescriptionKey(
      transaction.normalizedDescription || transaction.description
    );
    const key =
      direction === "credit"
        ? `${direction}:${descriptionKey}:${getTransactionAmount(transaction, "credit")}`
        : `${direction}:${descriptionKey}`;
    const existing = grouped.get(key) ?? [];

    existing.push(transaction);
    grouped.set(key, existing);
  }

  return [...grouped.values()];
}

function createSuggestion(
  transactions: NormalizedTransaction[],
  suggestionKind: ImportSuggestionKind,
  confidence: ConfidenceResult
): BankStatementSuggestion {
  const sorted = [...transactions].sort((first, second) =>
    first.date.localeCompare(second.date)
  );
  const latestTransaction = sorted[sorted.length - 1];
  const amountCents = getTransactionAmount(
    latestTransaction,
    suggestionKind === "income" ? "credit" : "debit"
  );

  const classification =
    suggestionKind === "income"
      ? confidence.score >= 90
        ? "likely_income"
        : confidence.score >= 60
          ? "possible_income"
          : "needs_review"
      : confidence.score >= 85
        ? "likely_bill"
        : confidence.score >= 60
          ? "possible_bill"
          : "needs_review";

  return {
    classification,
    classificationConfidence: confidence.score,
    classificationReason: confidence.reasons,
    detectedInterval: detectInterval(sorted.map((transaction) => transaction.date)),
    occurrenceCount: sorted.length,
    score: confidence.score,
    suggestedAmountCents: amountCents,
    suggestedDate: latestTransaction.date,
    suggestedName:
      suggestionKind === "bill"
        ? formatBillSuggestionName(
            latestTransaction.description,
            latestTransaction.normalizedDescription,
            latestTransaction.category
          )
        : latestTransaction.description,
    suggestionKind,
  };
}

export function applyTransactionClassifications(
  transactions: NormalizedTransaction[],
  suggestions: BankStatementImportResult["suggestions"]
) {
  const suggestionByKey = new Map<string, BankStatementSuggestion>();
  const ignoredByKey = new Map<string, NormalizedTransaction>();

  for (const suggestion of [
    ...suggestions.likelyBills,
    ...suggestions.likelyIncome,
    ...suggestions.possibleBills,
    ...suggestions.possibleIncome,
    ...suggestions.needsReview,
  ]) {
    suggestionByKey.set(
      `${suggestion.suggestionKind}:${normalizeDescriptionKey(suggestion.suggestedName)}:${suggestion.suggestedAmountCents}`,
      suggestion
    );
  }

  for (const transaction of suggestions.ignoredOrdinarySpending) {
    ignoredByKey.set(createTransactionClassificationKey(transaction), transaction);
  }

  return transactions.map((transaction) => {
    const amount =
      transaction.type === "credit"
        ? getTransactionAmount(transaction, "credit")
        : getTransactionAmount(transaction, "debit");
    const kind = transaction.type === "credit" ? "income" : "bill";
    const suggestion = suggestionByKey.get(
      `${kind}:${normalizeDescriptionKey(formatBillSuggestionName(transaction.description, transaction.normalizedDescription, transaction.category))}:${amount}`
    ) ?? suggestionByKey.get(
      `${kind}:${normalizeDescriptionKey(transaction.description)}:${amount}`
    );
    const ignoredTransaction = ignoredByKey.get(
      createTransactionClassificationKey(transaction)
    );

    if (ignoredTransaction) {
      return ignoredTransaction;
    }

    if (!suggestion) {
      if (transaction.type === "unknown" || shouldReviewTransaction(transaction)) {
        return classifyTransaction(transaction, {
          classification: "needs_review",
          confidence: 35,
          reasons: ["Transaction needs user review"],
        });
      }

      return transaction;
    }

    return classifyTransaction(transaction, {
      classification: suggestion.classification,
      confidence: suggestion.classificationConfidence,
      reasons: suggestion.classificationReason,
    });
  });
}

function createTransactionClassificationKey(transaction: NormalizedTransaction) {
  return [
    transaction.date,
    normalizeDescriptionKey(transaction.description),
    transaction.debitCents ?? "",
    transaction.creditCents ?? "",
    transaction.balanceCents ?? "",
  ].join("|");
}

function classifyTransaction(
  transaction: NormalizedTransaction,
  {
    classification,
    confidence,
    reasons,
  }: {
    classification: NormalizedTransaction["classification"];
    confidence: number;
    reasons: string[];
  }
): NormalizedTransaction {
  return {
    ...transaction,
    classification,
    classificationConfidence: clampConfidence(confidence),
    classificationReason: reasons,
  };
}

function sortSuggestions(suggestions: BankStatementSuggestion[]) {
  return [...suggestions].sort((first, second) =>
    first.suggestedName.localeCompare(second.suggestedName)
  );
}

function createScoringContext(
  transactions: NormalizedTransaction[]
): ScoringContext {
  return {
    creditAmountsAscending: transactions
      .filter((transaction) => transaction.type === "credit")
      .map((transaction) => getTransactionAmount(transaction, "credit"))
      .sort((first, second) => first - second),
    debitAmountsAscending: transactions
      .filter((transaction) => transaction.type === "debit")
      .map((transaction) => getTransactionAmount(transaction, "debit"))
      .sort((first, second) => first - second),
  };
}

function buildIncomeConfidence(
  transactions: NormalizedTransaction[],
  context: ScoringContext
): ConfidenceResult {
  const sorted = [...transactions].sort((first, second) =>
    first.date.localeCompare(second.date)
  );
  const latestTransaction = sorted[sorted.length - 1];
  const amount = getTransactionAmount(latestTransaction, "credit");
  const reasons: string[] = [];
  let score = 0;

  if (latestTransaction.type === "credit") {
    score += 40;
    reasons.push("Money is entering the account");
  } else if (latestTransaction.type === "debit") {
    score -= 60;
    reasons.push("Debit transactions cannot be income");
  } else {
    reasons.push("Transaction direction is unclear");
  }

  if (hasBalanceValidationEvidence(latestTransaction)) {
    score += 30;
    reasons.push("Running balance supports the credit direction");
  }

  if (isTopQuartileAmount(amount, context.creditAmountsAscending)) {
    score += 25;
    reasons.push("Amount is one of the larger credits in the statement");
  }

  if (hasSimilarAmountOccurrence(sorted, "credit")) {
    score += 25;
    reasons.push("Similar income amount appears more than once");
  }

  if (hasRecurringSpacingPattern(sorted)) {
    score += 20;
    reasons.push("Timing looks weekly, biweekly, semimonthly, or monthly");
  }

  if (isLikelyIncomeDescription(latestTransaction.description)) {
    score += 30;
    reasons.push("Description contains an income signal");
  }

  if (isNearCommonBillingDate(latestTransaction.date)) {
    score += 10;
    reasons.push("Date falls near a common pay or billing date");
  }

  if (isLikelyOrdinarySpendingDescription(latestTransaction.description)) {
    score -= 40;
    reasons.push("Description looks like ordinary spending");
  }

  if (isIgnoredCreditDescription(latestTransaction.description)) {
    score -= 25;
    reasons.push("Credit looks like a transfer or mobile deposit");
  }

  if (latestTransaction.outlierCoefficient <= 30) {
    score += 10;
    reasons.push("Transaction pattern is predictable");
  } else if (latestTransaction.outlierCoefficient >= 80) {
    score -= 25;
    reasons.push("Transaction looks unusual for the statement");
  } else if (latestTransaction.outlierCoefficient >= 65) {
    score -= 10;
    reasons.push("Transaction has some one-time characteristics");
  }

  if (
    amount < 15000 &&
    sorted.length === 1 &&
    !isLikelyIncomeDescription(latestTransaction.description) &&
    !isStructuralIncomeCategory(latestTransaction.category)
  ) {
    score -= 20;
    reasons.push("Small one-off credit without an income signal");
  }

  return {
    reasons: reasons.length > 0 ? reasons : ["No strong income signals found"],
    score: clampConfidence(score),
  };
}

function buildBillConfidence(
  transactions: NormalizedTransaction[],
  context: ScoringContext
): ConfidenceResult {
  const sorted = [...transactions].sort((first, second) =>
    first.date.localeCompare(second.date)
  );
  const latestTransaction = sorted[sorted.length - 1];
  const amount = getTransactionAmount(latestTransaction, "debit");
  const reasons: string[] = [];
  let score = 0;

  if (latestTransaction.type === "debit") {
    score += 40;
    reasons.push("Money is leaving the account");
  } else if (latestTransaction.type === "credit") {
    score -= 60;
    reasons.push("Credit transactions cannot be bills");
  } else {
    reasons.push("Transaction direction is unclear");
  }

  if (hasBalanceValidationEvidence(latestTransaction)) {
    score += 30;
    reasons.push("Running balance supports the debit direction");
  }

  if (hasSimilarAmountOccurrence(sorted, "debit")) {
    score += 25;
    reasons.push("Similar bill amount appears more than once");
  }

  if (hasRecurringSpacingPattern(sorted)) {
    score += 25;
    reasons.push("Timing looks weekly, biweekly, semimonthly, or monthly");
  }

  if (isTopQuartileAmount(amount, context.debitAmountsAscending)) {
    score += 20;
    reasons.push("Amount is one of the larger debits in the statement");
  }

  if (isNearCommonBillingDate(latestTransaction.date)) {
    score += 15;
    reasons.push("Date falls near a common billing date");
  }

  if (isLikelyBillDescription(latestTransaction.description)) {
    score += 20;
    reasons.push("Description contains a bill signal");
  }

  if (isLikelyOrdinarySpendingDescription(latestTransaction.description)) {
    score -= 35;
    reasons.push("Description looks like ordinary spending");
  }

  if (latestTransaction.outlierCoefficient <= 30) {
    score += 10;
    reasons.push("Transaction pattern is predictable");
  } else if (latestTransaction.outlierCoefficient >= 80) {
    score -= 25;
    reasons.push("Transaction looks unusual for the statement");
  } else if (latestTransaction.outlierCoefficient >= 65) {
    score -= 10;
    reasons.push("Transaction has some one-time characteristics");
  }

  if (
    amount < 1500 &&
    sorted.length === 1 &&
    !isLikelyBillDescription(latestTransaction.description) &&
    !isStructuralBillCategory(latestTransaction.category)
  ) {
    score -= 20;
    reasons.push("Small one-off debit without a bill signal");
  }

  return {
    reasons: reasons.length > 0 ? reasons : ["No strong bill signals found"],
    score: clampConfidence(score),
  };
}

function hasBalanceValidationEvidence(transaction: NormalizedTransaction) {
  return transaction.balanceCents != null && transaction.extractionConfidence >= 90;
}

function hasSimilarAmountOccurrence(
  transactions: NormalizedTransaction[],
  type: "credit" | "debit"
) {
  if (transactions.length < 2) {
    return false;
  }

  const amounts = transactions.map((transaction) =>
    getTransactionAmount(transaction, type)
  );
  const latestAmount = amounts[amounts.length - 1];

  return amounts.filter((amount) => areSimilarAmounts(amount, latestAmount)).length > 1;
}

function isTopQuartileAmount(amount: number, amountsAscending: number[]) {
  if (amountsAscending.length === 0) {
    return false;
  }

  const thresholdIndex = Math.floor(amountsAscending.length * 0.75);
  const threshold = amountsAscending[Math.min(thresholdIndex, amountsAscending.length - 1)];

  return amount >= threshold;
}

function shouldReviewTransaction(transaction: NormalizedTransaction) {
  return (
    transaction.type === "unknown" ||
    transaction.extractionConfidence < 60 ||
    isGenericCheckDescription(transaction.description) ||
    isLikelyTransferDescription(transaction.description)
  );
}

function shouldSurfaceCreditReview(transactions: NormalizedTransaction[]) {
  const latestTransaction = transactions[transactions.length - 1];

  if (isLikelyTransferDescription(latestTransaction.description)) {
    return false;
  }

  return (
    latestTransaction.suggestionType === "needs_review" &&
    ((latestTransaction.category === "unknown" &&
      latestTransaction.amountCents >= 15000) ||
      hasRecurringSpacingPattern(transactions) ||
      isReviewOnlyCreditCategory(latestTransaction.category))
    && !isOrdinarySpendingCategory(latestTransaction.category)
  );
}

function shouldSurfaceDebitReview(transactions: NormalizedTransaction[]) {
  const latestTransaction = transactions[transactions.length - 1];

  if (latestTransaction.category === "check") {
    return false;
  }

  return (
    !isIncomeCategory(latestTransaction.category) &&
    (isLikelyTransferDescription(latestTransaction.description) ||
      latestTransaction.amountCents >= 25000 ||
      hasRecurringSpacingPattern(transactions))
  );
}

function clampConfidence(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasRecurringSpacingPattern(transactions: NormalizedTransaction[]) {
  if (transactions.length < 2) {
    return false;
  }

  const sortedDates = [...transactions]
    .map((transaction) => transaction.date)
    .sort();
  const gaps = sortedDates
    .slice(1)
    .map((date, index) => daysBetween(sortedDates[index], date));

  return gaps.some(
    (gap) => isNear(gap, 7, 2) || isNear(gap, 14, 3) || isNear(gap, 15, 3) || isNear(gap, 30, 5)
  );
}

export function isLikelyOrdinarySpendingDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return /\b(?:amazon|bakery|bar|burger|cafe|card purchase|check|coffee|convenience|deli|dining|fast food|food|fuel|gas|grocery|groceries|market|pharmacy|pizza|pos|publix|restaurant|shell|starbucks|store|supermarket|walmart)\b/.test(
    normalized
  );
}

function isPointOfSalePurchaseDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return /\b(?:card purchase|debit card purchase|point of sale|pos purchase|pos)\b/.test(
    normalized
  );
}

function isGenericCheckDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return normalized === "check" || /^check \d+$/.test(normalized);
}

function formatBillSuggestionName(
  description: string,
  normalizedDescription?: string,
  category?: TransactionCategory
) {
  const canonical =
    category === "subscription" && normalizedDescription
      ? getCanonicalMerchantToken(normalizedDescription)
      : null;

  if (
    canonical &&
    normalizeDescriptionKey(description) !== normalizeDescriptionKey(canonical)
  ) {
    return canonical;
  }

  return description.replace(/\s+payment$/i, "").trim();
}

export function isLikelyBillDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return [
    "att",
    "at t",
    "at&t",
    "comcast",
    "direct debit",
    "duke",
    "duke energy",
    "electric",
    "fpl",
    "gym",
    "insurance",
    "internet",
    "jea",
    "light",
    "netflix",
    "ouc",
    "power",
    "property mgmt",
    "rent",
    "seco",
    "spectrum",
    "spotify",
    "subscription",
    "teco",
    "utility",
    "verizon",
    "water",
    "wireless",
    "xfinity",
    "youtube",
    "youtub",
  ].some((term) => normalized.includes(term));
}

export function isLikelyIncomeDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return [
    "benefit",
    "civ serv",
    "dfas",
    "direct dep",
    "direct deposit",
    "earnings",
    "net pay",
    "opm",
    "payroll",
    "pension",
    "postal service",
    "salary",
    "soc sec",
    "social security",
    "ssa",
    "treasury",
    "usps",
    "v a benefit",
    "v a benefits",
    "v a payment",
    "va benef",
    "va check",
    "va benefit",
    "va benefits",
    "va payment",
    "veteran benefit",
    "veterans affairs",
    "veterans",
    "wages",
  ].some((term) => normalized.includes(term));
}

function isIgnoredCreditDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return isLikelyTransferDescription(normalized);
}

function hasPaycheckDescriptionSignal(description: string) {
  if (isLikelyIncomeDescription(description)) {
    return true;
  }

  const normalized = normalizeDescriptionKey(description);

  if (
    /\b(?:ach credit|mobile deposit|preauthorized credit|random entry|refund|transfer from|zelle)\b/.test(
      normalized
    )
  ) {
    return false;
  }

  return (
    /\b(?:corporation pay|direct dep|employer|net pay|paycheck|payroll|salary|wages)\b/.test(
      normalized
    ) ||
    (/\bpay\b/.test(normalized) &&
      !/\b(?:auto pay|bill pay|payment)\b/.test(normalized))
  );
}

function isLikelyTransferDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return /\b(?:card reward|cash back|friend transfer|mobile deposit|transfer from|transfer|zelle)\b/.test(
    normalized
  );
}

export function isDebitText(value: string) {
  const normalized = normalizeDescriptionKey(value);

  return /\b(?:ach debit|charge|debit|payment|purchase|withdrawal)\b/.test(
    normalized
  );
}

export function isCreditText(value: string) {
  const normalized = normalizeDescriptionKey(value);

  return /\b(?:ach credit|credit|deposit|payroll|payment received)\b/.test(
    normalized
  );
}
