import type { ImportSuggestionInterval, ImportSuggestionKind } from "@/database/repositories/types";
import type { TransactionCategory } from "@/features/import/classification/categoryVocabulary";
import type { BudgetFlowSuggestionType } from "@/features/import/classification/suggestionMapper";

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

export type StatementSectionKind = "debit" | "credit" | "unknown";

export type StatementRow = {
  line: string;
  sectionKind: StatementSectionKind;
  startLineIndex: number;
};

export type TableColumns = {
  amount: number | null;
  balance: number | null;
  credit: number | null;
  date: number;
  debit: number | null;
  description: number;
  transactionType: number | null;
};

export type ScoringContext = {
  creditAmountsAscending: number[];
  debitAmountsAscending: number[];
};

export type ConfidenceResult = {
  reasons: string[];
  score: number;
};
