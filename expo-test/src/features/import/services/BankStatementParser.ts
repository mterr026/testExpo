import { extractCsvTransactions } from "./bankStatement/csvExtraction";
import { extractTextTransactions } from "./bankStatement/textExtraction";
import { validateRunningBalances } from "./bankStatement/transactions";
import {
  applyTransactionCategoryPredictions,
  applyTransactionClassifications,
  classifySuggestions,
} from "./bankStatement/suggestions";
import type {
  BankStatementImportResult,
  BankStatementParseOptions,
  NormalizedTransaction,
} from "./bankStatement/types";

export type {
  BankStatementImportResult,
  BankStatementParseOptions,
  BankStatementSuggestion,
  NormalizedTransaction,
} from "./bankStatement/types";

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
