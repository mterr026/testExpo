import type {
  ImportSuggestionInterval,
  ImportSuggestionKind,
} from "@/database/repositories/types";
import type { TransactionCategory } from "@/features/import/classification/categoryVocabulary";
import { calculateOutlierCoefficient } from "@/features/import/classification/outlierCoefficient";
import { classifyTransactionDescription } from "@/features/import/classification/transactionClassifier";
import {
  isBillSuggestion,
  isIncomeCategory,
  isIncomeSuggestion,
  isOrdinarySpendingCategory,
  isReviewOnlyCreditCategory,
  mapCategoryToSuggestion,
  type BudgetFlowSuggestionType,
} from "@/features/import/classification/suggestionMapper";

export type NormalizedTransaction = {
  amountCents: number;
  category: TransactionCategory;
  categoryConfidence: number;
  date: string;
  description: string;
  debitCents: number | null;
  creditCents: number | null;
  balanceCents: number | null;
  type: "debit" | "credit" | "unknown";
  extractionConfidence: number;
  classification:
    | "ignored_ordinary_spending"
    | "likely_bill"
    | "likely_income"
    | "needs_review"
    | "possible_bill"
    | "possible_income"
    | "unclassified";
  classificationConfidence: number;
  classificationReason: string[];
  normalizedDescription: string;
  outlierCoefficient: number;
  reasons: string[];
  source: "csv" | "pdf_ocr" | "pdf_text";
  suggestionType: BudgetFlowSuggestionType;
};

export type BankStatementSuggestion = {
  detectedInterval: ImportSuggestionInterval;
  occurrenceCount: number;
  suggestedAmountCents: number;
  suggestedDate: string | null;
  suggestedName: string;
  suggestionKind: ImportSuggestionKind;
  classification:
    | "likely_bill"
    | "likely_income"
    | "needs_review"
    | "possible_bill"
    | "possible_income";
  classificationConfidence: number;
  classificationReason: string[];
  score: number;
};

export type BankStatementImportResult = {
  transactions: NormalizedTransaction[];
  suggestions: {
    likelyBills: BankStatementSuggestion[];
    likelyIncome: BankStatementSuggestion[];
    needsReview: BankStatementSuggestion[];
    possibleBills: BankStatementSuggestion[];
    possibleIncome: BankStatementSuggestion[];
    reviewSuggested: BankStatementSuggestion[];
    ignoredOrdinarySpending: NormalizedTransaction[];
  };
  diagnostics: {
    balanceValidationFailures: number;
    creditsDetected: number;
    debitsDetected: number;
    ignoredOrdinarySpendingCount: number;
    totalRowsDetected: number;
    totalTransactionsParsed: number;
    unknownDetected: number;
  };
};

export type BankStatementParseOptions = {
  includeSingleOccurrenceCandidates?: boolean;
  parseAsStatementText?: boolean;
  source?: NormalizedTransaction["source"];
};

type StatementSectionKind = "debit" | "credit" | "unknown";

type TableColumns = {
  amount: number | null;
  balance: number | null;
  credit: number | null;
  date: number;
  debit: number | null;
  description: number;
  transactionType: number | null;
};

type ScoringContext = {
  creditAmountsAscending: number[];
  debitAmountsAscending: number[];
};

type ConfidenceResult = {
  reasons: string[];
  score: number;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseBankStatementImport(
  statementText: string,
  options: BankStatementParseOptions = {}
): BankStatementImportResult {
  const source = getSource(options);
  const transactions = extractNormalizedTransactions(statementText, {
    parseAsStatementText: options.parseAsStatementText ?? false,
    source,
  });
  const validatedTransactions = validateRunningBalances(transactions);
  const categorizedTransactions = applyTransactionCategoryPredictions(
    validatedTransactions
  );
  const suggestions = classifySuggestions(
    categorizedTransactions,
    options.includeSingleOccurrenceCandidates ?? false
  );
  const classifiedTransactions = applyTransactionClassifications(
    categorizedTransactions,
    suggestions
  );

  return {
    diagnostics: {
      balanceValidationFailures: classifiedTransactions.filter(
        (transaction) => transaction.type === "unknown" && transaction.balanceCents != null
      ).length,
      creditsDetected: classifiedTransactions.filter(
        (transaction) => transaction.type === "credit"
      ).length,
      debitsDetected: classifiedTransactions.filter(
        (transaction) => transaction.type === "debit"
      ).length,
      ignoredOrdinarySpendingCount: suggestions.ignoredOrdinarySpending.length,
      totalRowsDetected: classifiedTransactions.length,
      totalTransactionsParsed: classifiedTransactions.length,
      unknownDetected: classifiedTransactions.filter(
        (transaction) => transaction.type === "unknown"
      ).length,
    },
    suggestions,
    transactions: classifiedTransactions,
  };
}

function getSource(options: BankStatementParseOptions): NormalizedTransaction["source"] {
  if (options.source) {
    return options.source;
  }

  return options.parseAsStatementText ? "pdf_ocr" : "csv";
}

function extractNormalizedTransactions(
  statementText: string,
  {
    parseAsStatementText,
    source,
  }: {
    parseAsStatementText: boolean;
    source: NormalizedTransaction["source"];
  }
) {
  if (!parseAsStatementText) {
    const csvTransactions = extractCsvTransactions(statementText, source);

    if (csvTransactions) {
      return csvTransactions;
    }
  }

  return extractTextTransactions(statementText, source);
}

function extractCsvTransactions(
  csvText: string,
  source: NormalizedTransaction["source"]
) {
  const rows = parseCsvRows(csvText);

  if (rows.length < 2 || rows.every((row) => row.length === 1)) {
    return null;
  }

  const columns = detectCsvColumns(rows[0]);

  if (!columns) {
    return null;
  }

  return rows
    .slice(1)
    .map((row) => parseCsvTransactionRow(row, columns, source))
    .filter(
      (transaction): transaction is NormalizedTransaction => transaction != null
    );
}

function detectCsvColumns(headerRow: string[]): TableColumns | null {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const date = findHeaderIndex(normalizedHeaders, [
    "date",
    "posted",
    "transaction date",
    "posted date",
    "post date",
    "posting date",
  ]);
  const description = findHeaderIndex(normalizedHeaders, [
    "merchant",
    "payee",
    "description",
    "details",
    "memo",
    "name",
  ]);
  const debit = findHeaderIndex(normalizedHeaders, [
    "debit",
    "debits",
    "withdrawal",
    "withdrawals",
    "charge",
    "charges",
  ]);
  const credit = findHeaderIndex(normalizedHeaders, [
    "credit",
    "credits",
    "deposit",
    "deposits",
  ]);
  const amount = findHeaderIndex(normalizedHeaders, [
    "amount",
    "transaction amount",
  ]);
  const balance = findHeaderIndex(normalizedHeaders, ["balance", "running balance"]);
  const transactionType = findHeaderIndex(normalizedHeaders, [
    "type",
    "transaction type",
    "transactiontype",
  ]);

  if (date == null || description == null || (amount == null && debit == null && credit == null)) {
    return null;
  }

  return {
    amount,
    balance,
    credit,
    date,
    debit,
    description,
    transactionType,
  };
}

function parseCsvTransactionRow(
  row: string[],
  columns: TableColumns,
  source: NormalizedTransaction["source"]
): NormalizedTransaction | null {
  const date = normalizeDate(row[columns.date] ?? "");
  const description = sanitizeDescription(row[columns.description] ?? "");

  if (!date || !description || isSummaryDescription(description)) {
    return null;
  }

  const debitCents =
    columns.debit == null ? null : parseMoneyAmountToCents(row[columns.debit] ?? "");
  const creditCents =
    columns.credit == null
      ? null
      : parseMoneyAmountToCents(row[columns.credit] ?? "");
  const amountCents =
    columns.amount == null
      ? null
      : parseMoneyAmountToCents(row[columns.amount] ?? "");
  const balanceCents =
    columns.balance == null
      ? null
      : parseMoneyAmountToCents(row[columns.balance] ?? "");

  if (debitCents != null && debitCents !== 0) {
    return createTransaction({
      balanceCents,
      date,
      debitCents: Math.abs(debitCents),
      description,
      source,
      type: "debit",
      extractionConfidence: 95,
    });
  }

  if (creditCents != null && creditCents !== 0) {
    return createTransaction({
      balanceCents,
      creditCents: Math.abs(creditCents),
      date,
      description,
      source,
      type: "credit",
      extractionConfidence: 95,
    });
  }

  if (amountCents == null || amountCents === 0) {
    return null;
  }

  if (amountCents < 0) {
    return createTransaction({
      balanceCents,
      date,
      debitCents: Math.abs(amountCents),
      description,
      source,
      type: "debit",
      extractionConfidence: 90,
    });
  }

  const transactionType = columns.transactionType == null
    ? ""
    : row[columns.transactionType] ?? "";

  if (isDebitText(transactionType)) {
    return createTransaction({
      balanceCents,
      date,
      debitCents: Math.abs(amountCents),
      description,
      source,
      type: "debit",
      extractionConfidence: 88,
    });
  }

  if (isCreditText(transactionType)) {
    return createTransaction({
      balanceCents,
      creditCents: Math.abs(amountCents),
      date,
      description,
      source,
      type: "credit",
      extractionConfidence: 88,
    });
  }

  return createTransaction({
    balanceCents,
    creditCents: Math.abs(amountCents),
    date,
    description,
    source,
    type: isLikelyIncomeDescription(description) ? "credit" : "unknown",
    extractionConfidence: 70,
  });
}

function extractTextTransactions(
  statementText: string,
  source: NormalizedTransaction["source"]
) {
  const inferredYear = inferStatementYear(statementText);
  const annotatedLines = annotateStatementSections(splitStatementLines(statementText));
  const rows = buildStatementRows(annotatedLines);
  const transactions = rows
    .map((row) => parseStatementRow(row, inferredYear, source))
    .filter(
      (transaction): transaction is NormalizedTransaction => transaction != null
    );
  const uniqueTransactions = new Map<string, NormalizedTransaction>();

  for (const transaction of transactions) {
    uniqueTransactions.set(
      `${transaction.date}|${transaction.description}|${transaction.debitCents ?? ""}|${transaction.creditCents ?? ""}|${transaction.balanceCents ?? ""}`,
      transaction
    );
  }

  return [...uniqueTransactions.values()];
}

function buildStatementRows(
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[]
) {
  const rows: {
    line: string;
    sectionKind: StatementSectionKind;
  }[] = [];
  let currentParts: string[] = [];
  let currentSectionKind: StatementSectionKind = "unknown";

  for (const { line, sectionKind } of annotatedLines) {
    if (isStatementTableHeader(line) || isIgnoredStatementLine(line)) {
      continue;
    }

    if (containsStatementDate(line)) {
      appendStatementRow(rows, currentParts, currentSectionKind);
      currentParts = [line];
      currentSectionKind = sectionKind;
      continue;
    }

    if (currentParts.length === 0) {
      continue;
    }

    currentParts.push(line);

    if (findMoneyAmounts(line).length >= 1) {
      appendStatementRow(rows, currentParts, currentSectionKind);
      currentParts = [];
    }
  }

  appendStatementRow(rows, currentParts, currentSectionKind);

  return rows;
}

function appendStatementRow(
  rows: {
    line: string;
    sectionKind: StatementSectionKind;
  }[],
  parts: string[],
  sectionKind: StatementSectionKind
) {
  if (parts.length === 0) {
    return;
  }

  rows.push({
    line: parts.join(" "),
    sectionKind,
  });
}

function parseStatementRow(
  row: {
    line: string;
    sectionKind: StatementSectionKind;
  },
  inferredYear: number,
  source: NormalizedTransaction["source"]
): NormalizedTransaction | null {
  const dateMatch = row.line.match(
    /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)\b/
  );

  if (!dateMatch || dateMatch.index == null) {
    return null;
  }

  const date = normalizeDate(dateMatch[0], inferredYear);
  const moneyMatches = findMoneyAmounts(row.line).filter(
    (match) => match.index != null && dateMatch.index != null && match.index > dateMatch.index
  );

  if (!date || moneyMatches.length === 0) {
    return null;
  }

  const balanceMatch = moneyMatches.length >= 2 ? moneyMatches[moneyMatches.length - 1] : null;
  const amountMatch = moneyMatches.length >= 2 ? moneyMatches[moneyMatches.length - 2] : moneyMatches[0];

  if (!amountMatch.index) {
    return null;
  }

  const leadingDescription = sanitizeDescription(
    row.line.slice(dateMatch.index + dateMatch[0].length, amountMatch.index)
  );
  const trailingDescription = sanitizeDescription(
    row.line.slice(amountMatch.index + amountMatch[0].length)
  );
  const description = leadingDescription || trailingDescription;
  const amountCents = parseMoneyAmountToCents(amountMatch[0]);
  const balanceCents = balanceMatch
    ? parseMoneyAmountToCents(balanceMatch[0])
    : null;

  if (!description || amountCents == null || isSummaryDescription(description)) {
    return null;
  }

  if (amountCents < 0) {
    return createTransaction({
      balanceCents,
      date,
      debitCents: Math.abs(amountCents),
      description,
      source,
      type: "debit",
      extractionConfidence: 80,
    });
  }

  if (amountCents > 0 && (row.sectionKind === "credit" || isCreditText(row.line))) {
    return createTransaction({
      balanceCents,
      creditCents: amountCents,
      date,
      description,
      source,
      type: "credit",
      extractionConfidence: 78,
    });
  }

  if (amountCents > 0 && isLikelyIncomeDescription(description)) {
    return createTransaction({
      balanceCents,
      creditCents: amountCents,
      date,
      description,
      source,
      type: "credit",
      extractionConfidence: 72,
    });
  }

  if (amountCents > 0 && (row.sectionKind === "debit" || isDebitText(row.line))) {
    return createTransaction({
      balanceCents,
      date,
      debitCents: amountCents,
      description,
      source,
      type: "debit",
      extractionConfidence: 78,
    });
  }

  if (amountCents > 0 && isLikelyBillDescription(description)) {
    return createTransaction({
      balanceCents,
      date,
      debitCents: amountCents,
      description,
      source,
      type: "debit",
      extractionConfidence: 60,
    });
  }

  if (amountCents > 0 && isLikelyOrdinarySpendingDescription(description)) {
    return createTransaction({
      balanceCents,
      date,
      debitCents: amountCents,
      description,
      source,
      type: "debit",
      extractionConfidence: 55,
    });
  }

  return createTransaction({
    balanceCents,
    creditCents: amountCents,
    date,
    description,
    source,
    type: isLikelyIncomeDescription(description) ? "credit" : "unknown",
    extractionConfidence: 55,
  });
}

function createTransaction({
  balanceCents,
  creditCents = null,
  date,
  debitCents = null,
  description,
  extractionConfidence,
  source,
  type,
}: {
  balanceCents: number | null;
  creditCents?: number | null;
  date: string;
  debitCents?: number | null;
  description: string;
  extractionConfidence: number;
  source: NormalizedTransaction["source"];
  type: NormalizedTransaction["type"];
}): NormalizedTransaction {
  return {
    amountCents: Math.abs(creditCents ?? debitCents ?? 0),
    balanceCents,
    category: "unknown",
    categoryConfidence: 0,
    classification: "unclassified",
    classificationConfidence: 0,
    classificationReason: [],
    creditCents,
    date,
    debitCents,
    description,
    extractionConfidence,
    normalizedDescription: description,
    outlierCoefficient: 50,
    reasons: [],
    source,
    suggestionType: "needs_review",
    type,
  };
}

function validateRunningBalances(transactions: NormalizedTransaction[]) {
  return transactions.map((transaction, index) => {
    const previousTransaction = transactions[index - 1];

    if (
      transaction.balanceCents == null ||
      previousTransaction?.balanceCents == null
    ) {
      return transaction;
    }

    const debitCents = getTransactionAmount(transaction, "debit");
    const creditCents = getTransactionAmount(transaction, "credit");
    const expectedDebitBalance = previousTransaction.balanceCents - debitCents;
    const expectedCreditBalance = previousTransaction.balanceCents + creditCents;
    const debitMatches =
      debitCents > 0 && Math.abs(expectedDebitBalance - transaction.balanceCents) <= 1;
    const creditMatches =
      creditCents > 0 && Math.abs(expectedCreditBalance - transaction.balanceCents) <= 1;

    if (debitMatches) {
      return {
        ...transaction,
        creditCents: null,
        debitCents,
        extractionConfidence: Math.max(transaction.extractionConfidence, 90),
        type: "debit" as const,
      };
    }

    if (creditMatches) {
      return {
        ...transaction,
        creditCents,
        debitCents: null,
        extractionConfidence: Math.max(transaction.extractionConfidence, 90),
        type: "credit" as const,
      };
    }

    return transaction.type === "unknown"
      ? {
          ...transaction,
          extractionConfidence: Math.min(transaction.extractionConfidence, 45),
          type: "unknown" as const,
        }
      : {
          ...transaction,
          extractionConfidence: Math.min(transaction.extractionConfidence, 55),
        };
  });
}

function getTransactionAmount(
  transaction: NormalizedTransaction,
  type: "credit" | "debit"
) {
  if (type === "credit") {
    return transaction.creditCents ?? transaction.debitCents ?? 0;
  }

  return transaction.debitCents ?? transaction.creditCents ?? 0;
}

function applyTransactionCategoryPredictions(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  const categorizedTransactions = transactions.map((transaction) => {
    const prediction = classifyTransactionDescription(transaction.description);
    const amountCents =
      transaction.type === "credit"
        ? getTransactionAmount(transaction, "credit")
        : getTransactionAmount(transaction, "debit");
    const suggestionType = isPointOfSalePurchaseDescription(transaction.description)
      ? "ignored_ordinary_spending"
      : mapCategoryToSuggestion({
          category: prediction.category,
          categoryConfidence: prediction.confidence,
          direction: transaction.type,
        });

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

  return categorizedTransactions.map((transaction) => {
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
    return "needs_review";
  }

  if (
    transaction.type === "debit" &&
    transaction.suggestionType === "likely_bill" &&
    outlierCoefficient >= 85
  ) {
    return "needs_review";
  }

  if (
    transaction.type === "debit" &&
    transaction.suggestionType === "likely_bill" &&
    outlierCoefficient >= 70
  ) {
    return "possible_bill";
  }

  if (
    transaction.type === "credit" &&
    transaction.suggestionType === "likely_income" &&
    outlierCoefficient >= 85
  ) {
    return "possible_income";
  }

  return transaction.suggestionType;
}

function classifySuggestions(
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

    if (latestTransaction.type === "credit") {
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

    if (latestTransaction.type !== "debit") {
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
    if (transaction.type === "unknown") {
      continue;
    }

    const key =
      transaction.type === "credit"
        ? `${transaction.type}:${normalizeDescriptionKey(transaction.description)}:${getTransactionAmount(transaction, "credit")}`
        : `${transaction.type}:${normalizeDescriptionKey(transaction.description)}`;
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
        ? formatBillSuggestionName(latestTransaction.description)
        : latestTransaction.description,
    suggestionKind,
  };
}

function applyTransactionClassifications(
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
      `${kind}:${normalizeDescriptionKey(formatBillSuggestionName(transaction.description))}:${amount}`
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
    !isLikelyIncomeDescription(latestTransaction.description)
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
    !isLikelyBillDescription(latestTransaction.description)
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

function isLikelyOrdinarySpendingDescription(description: string) {
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

function formatBillSuggestionName(description: string) {
  return description.replace(/\s+payment$/i, "").trim();
}

function isLikelyBillDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return [
    "att",
    "at t",
    "at&t",
    "comcast",
    "duke",
    "duke energy",
    "electric",
    "florida power",
    "fpl",
    "gym",
    "insurance",
    "internet",
    "light",
    "netflix",
    "power",
    "spotify",
    "subscription",
    "utility",
    "verizon",
    "water",
    "wireless",
    "xfinity",
  ].some((term) => normalized.includes(term));
}

function isLikelyIncomeDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return [
    "benefit",
    "direct deposit",
    "payroll",
    "pension",
    "salary",
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

function isLikelyTransferDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return /\b(?:card reward|cash back|friend transfer|mobile deposit|transfer from|transfer|zelle)\b/.test(
    normalized
  );
}

function isDebitText(value: string) {
  const normalized = normalizeDescriptionKey(value);

  return /\b(?:ach debit|charge|debit|payment|purchase|withdrawal)\b/.test(
    normalized
  );
}

function isCreditText(value: string) {
  const normalized = normalizeDescriptionKey(value);

  return /\b(?:ach credit|credit|deposit|payroll|payment received)\b/.test(
    normalized
  );
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === "\"" && insideQuotes && nextCharacter === "\"") {
      currentCell += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      appendCsvRow(rows, currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell.trim());
  appendCsvRow(rows, currentRow);

  return rows;
}

function appendCsvRow(rows: string[][], row: string[]) {
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  const index = headers.findIndex((header) => candidates.includes(header));

  return index < 0 ? null : index;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

function splitStatementLines(statementText: string) {
  return statementText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function annotateStatementSections(lines: string[]) {
  const annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[] = [];
  let sectionKind: StatementSectionKind = "unknown";

  for (const line of lines) {
    sectionKind = classifyStatementSectionHeader(line) ?? sectionKind;
    annotatedLines.push({ line, sectionKind });
  }

  return annotatedLines;
}

function classifyStatementSectionHeader(value: string): StatementSectionKind | null {
  if (
    containsStatementDate(value) ||
    findMoneyAmounts(value).length > 0 ||
    isStatementTableHeader(value)
  ) {
    return null;
  }

  const normalized = normalizeDescriptionKey(value);

  if (
    /\b(?:credits?|deposits?|additions?|income|direct deposit|payroll deposit|ach credit|payments received)\b/.test(
      normalized
    ) &&
    !/\b(?:debits?|withdrawals?|subtractions?|payments?|checks?)\b/.test(
      normalized
    )
  ) {
    return "credit";
  }

  if (
    /\b(?:ach debit|atm|card purchases?|debits?|expenses?|payments?|purchases?|withdrawals?)\b/.test(
      normalized
    )
  ) {
    return "debit";
  }

  return null;
}

function isStatementTableHeader(value: string) {
  const normalized = normalizeDescriptionKey(value);

  return (
    /\bdate\b/.test(normalized) &&
    (/\bdescription\b/.test(normalized) ||
      /\bdebit\b/.test(normalized) ||
      /\bcredit\b/.test(normalized) ||
      /\bbalance\b/.test(normalized) ||
      /\bamount\b/.test(normalized))
  );
}

function isIgnoredStatementLine(value: string) {
  const normalized = normalizeDescriptionKey(value);

  return /^(?:account summary|average balance|beginning balance|continued|ending balance|interest bearing days|page \d+|summary|total|totals)$/.test(
    normalized
  );
}

function isSummaryDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return /\b(?:account summary|average balance|beginning balance|ending balance|interest bearing days|summary|total|totals)\b/.test(
    normalized
  );
}

function containsStatementDate(value: string) {
  return /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)\b/.test(
    value
  );
}

function findMoneyAmounts(line: string) {
  return [...line.matchAll(/[-+]?\(?\$?(?:\d[\d,]*\.\d{2}|\.\d{2})\)?/g)];
}

function parseMoneyAmountToCents(value: string) {
  const normalized = value
    .trim()
    .replace(/[$,]/g, "")
    .replace(/^\((.+)\)$/, "-$1");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function normalizeDate(value: string, inferredYear: number | null = null) {
  const trimmed = value.trim();

  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const slashMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/
  );

  if (!slashMatch || (!slashMatch[3] && inferredYear == null)) {
    return null;
  }

  const [, monthText, dayText, yearText] = slashMatch;
  const year = Number(
    yearText == null
      ? inferredYear
      : yearText.length === 2
        ? `20${yearText}`
        : yearText
  );
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isoDate = formatUtcIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? isoDate
    : null;
}

function formatUtcIsoDate(year: number, month: number, day: number) {
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function inferStatementYear(statementText: string) {
  const years = [...statementText.matchAll(/\b(20\d{2}|19\d{2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year >= 2000 && year <= 2100);

  return years[0] ?? new Date().getFullYear();
}

function sanitizeDescription(value: string) {
  return value
    .replace(/\b(?:acct|account|card|routing|trace|ref|confirmation)\b.*$/i, "")
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\b(?:auto pay|bill pay|online|recurring|autopay)\b/gi, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, "")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function normalizeDescriptionKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectInterval(dates: string[]): ImportSuggestionInterval {
  const gaps = dates
    .slice(1)
    .map((date, index) => daysBetween(dates[index], date));
  const averageGap =
    gaps.reduce((sum, gap) => sum + gap, 0) / Math.max(gaps.length, 1);

  if (isNear(averageGap, 7, 2)) {
    return "weekly";
  }

  if (isNear(averageGap, 14, 3)) {
    return "biweekly";
  }

  if (isNear(averageGap, 30, 5)) {
    return "monthly";
  }

  if (isNear(averageGap, 91, 10)) {
    return "quarterly";
  }

  return "irregular";
}

function isNearCommonBillingDate(date: string) {
  const day = Number(date.slice(-2));

  return (
    (day >= 1 && day <= 5) ||
    (day >= 14 && day <= 16) ||
    day >= 28
  );
}

function areSimilarAmounts(firstAmountCents: number, secondAmountCents: number) {
  return (
    Math.abs(firstAmountCents - secondAmountCents) <=
    Math.max(100, Math.round(secondAmountCents * 0.03))
  );
}

function daysBetween(firstDate: string, secondDate: string) {
  return (
    (parseIsoDate(secondDate).getTime() - parseIsoDate(firstDate).getTime()) /
    (24 * 60 * 60 * 1000)
  );
}

function parseIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-");

  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}

function isNear(value: number, target: number, tolerance: number) {
  return Math.abs(value - target) <= tolerance;
}
