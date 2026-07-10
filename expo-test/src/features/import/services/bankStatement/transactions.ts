import type { NormalizedTransaction } from "./types";

export function createTransaction({
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

export function validateRunningBalances(transactions: NormalizedTransaction[]) {
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

export function getTransactionAmount(
  transaction: NormalizedTransaction,
  type: "credit" | "debit"
) {
  if (type === "credit") {
    return transaction.creditCents ?? transaction.debitCents ?? 0;
  }

  return transaction.debitCents ?? transaction.creditCents ?? 0;
}

export function resolveTransactionDirection(
  transaction: Pick<NormalizedTransaction, "creditCents" | "debitCents" | "type">
): "credit" | "debit" | "unknown" {
  if (transaction.type === "credit" || transaction.type === "debit") {
    return transaction.type;
  }

  if (transaction.creditCents != null && transaction.debitCents == null) {
    return "credit";
  }

  if (transaction.debitCents != null && transaction.creditCents == null) {
    return "debit";
  }

  return "unknown";
}
