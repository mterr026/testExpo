import {
  findHeaderIndex,
  isSummaryDescription,
  normalizeDate,
  normalizeHeader,
  parseCsvRows,
  parseMoneyAmountToCents,
  sanitizeDescription,
} from "./parsingUtils";
import { createTransaction } from "./transactions";
import type { NormalizedTransaction, TableColumns } from "./types";
import { isCreditText, isDebitText, isLikelyIncomeDescription } from "./suggestions";

export function extractCsvTransactions(
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
