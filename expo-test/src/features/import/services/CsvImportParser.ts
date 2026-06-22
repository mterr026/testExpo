import type {
  ImportSuggestionInterval,
  ImportSuggestionKind,
} from "@/database/repositories/types";

import {
  parseBankStatementImport,
  type BankStatementParseOptions,
} from "./BankStatementParser";

export type CsvImportSuggestionCandidate = {
  suggestedName: string;
  suggestedAmountCents: number;
  suggestionKind: ImportSuggestionKind;
  suggestedDate: string | null;
  detectedInterval: ImportSuggestionInterval;
  occurrenceCount: number;
};

export type ParseImportSuggestionOptions = {
  includeSingleOccurrenceCandidates?: boolean;
  parseAsStatementText?: boolean;
};

export type StatementImportDiagnostics = {
  amountLineCount: number;
  creditTransactionCount: number;
  dateLineCount: number;
  debitTransactionCount: number;
  ignoredOrdinarySpendingCount: number;
  lineCount: number;
  likelyBillTransactionCount: number;
  parsedTransactionCount: number;
  stitchedLineCount: number;
  transactionSamples: StatementImportTransactionSample[];
};

export type StatementImportTransactionSample = {
  amountCents: number;
  date: string;
  merchant: string;
  transactionType: "credit" | "debit";
};

export function parseCsvImportSuggestions(
  csvText: string,
  options: ParseImportSuggestionOptions = {}
): CsvImportSuggestionCandidate[] {
  assertValidCsvShape(csvText, options);

  const importResult = parseBankStatementImport(csvText, toBankParserOptions(options));

  return [
    ...importResult.suggestions.possibleBills,
    ...importResult.suggestions.possibleIncome,
  ]
    .map(
      ({
        detectedInterval,
        occurrenceCount,
        suggestedAmountCents,
        suggestedDate,
        suggestedName,
        suggestionKind,
      }) => ({
        detectedInterval,
        occurrenceCount,
        suggestedAmountCents,
        suggestedDate,
        suggestedName,
        suggestionKind,
      })
    )
    .sort((first, second) =>
      first.suggestedName.localeCompare(second.suggestedName)
    );
}

export function createStatementImportDiagnostics(
  statementText: string,
  options: ParseImportSuggestionOptions = {
    parseAsStatementText: true,
  }
): StatementImportDiagnostics {
  const importResult = parseBankStatementImport(
    statementText,
    toBankParserOptions(options)
  );
  const lines = splitStatementLines(statementText);

  return {
    amountLineCount: lines.filter((line) => findMoneyAmounts(line).length > 0).length,
    creditTransactionCount: importResult.diagnostics.creditsDetected,
    dateLineCount: lines.filter(containsStatementDate).length,
    debitTransactionCount: importResult.diagnostics.debitsDetected,
    ignoredOrdinarySpendingCount:
      importResult.diagnostics.ignoredOrdinarySpendingCount,
    lineCount: lines.length,
    likelyBillTransactionCount: importResult.suggestions.possibleBills.length,
    parsedTransactionCount: importResult.diagnostics.totalTransactionsParsed,
    stitchedLineCount: countStitchedStatementRows(lines),
    transactionSamples: importResult.transactions.slice(0, 6).map((transaction) => ({
      amountCents: transaction.creditCents ?? transaction.debitCents ?? 0,
      date: transaction.date,
      merchant: transaction.description,
      transactionType: transaction.type === "credit" ? "credit" : "debit",
    })),
  };
}

function toBankParserOptions(
  options: ParseImportSuggestionOptions
): BankStatementParseOptions {
  return {
    includeSingleOccurrenceCandidates: options.includeSingleOccurrenceCandidates,
    parseAsStatementText: options.parseAsStatementText,
    source: options.parseAsStatementText ? "pdf_ocr" : "csv",
  };
}

function assertValidCsvShape(
  csvText: string,
  options: ParseImportSuggestionOptions
) {
  if (options.parseAsStatementText) {
    return;
  }

  const rows = parseCsvRows(csvText);

  if (rows.length < 2 || rows.every((row) => row.length === 1)) {
    return;
  }

  const headers = rows[0].map(normalizeHeader);
  const hasDate = hasAnyHeader(headers, [
    "date",
    "posted",
    "transaction date",
    "posted date",
    "post date",
    "posting date",
  ]);
  const hasDescription = hasAnyHeader(headers, [
    "merchant",
    "payee",
    "description",
    "details",
    "memo",
    "name",
  ]);
  const hasAmount = hasAnyHeader(headers, [
    "amount",
    "transaction amount",
    "debit",
    "debits",
    "withdrawal",
    "withdrawals",
    "charge",
    "charges",
    "credit",
    "credits",
    "deposit",
    "deposits",
  ]);

  if (!hasDate || !hasDescription || !hasAmount) {
    throw new Error("CSV import requires date, merchant, and amount columns.");
  }
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

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

function hasAnyHeader(headers: string[], candidates: string[]) {
  return headers.some((header) => candidates.includes(header));
}

function splitStatementLines(statementText: string) {
  return statementText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function containsStatementDate(value: string) {
  return /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)\b/.test(
    value
  );
}

function findMoneyAmounts(line: string) {
  return [...line.matchAll(/[-+]?\(?\$?(?:\d[\d,]*\.\d{2}|\.\d{2})\)?/g)];
}

function countStitchedStatementRows(lines: string[]) {
  let count = 0;
  let hasOpenRow = false;

  for (const line of lines) {
    if (containsStatementDate(line)) {
      if (hasOpenRow) {
        count += 1;
      }

      hasOpenRow = true;
      continue;
    }

    if (hasOpenRow && findMoneyAmounts(line).length > 0) {
      count += 1;
      hasOpenRow = false;
    }
  }

  return count + (hasOpenRow ? 1 : 0);
}
