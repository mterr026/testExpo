export type ImportTransactionDirection = "credit" | "debit" | "unknown";

function normalizeImportDescription(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasPayrollSignal(normalized: string) {
  return /\b(?:direct dep|direct deposit|employer|fed salary|net pay|paycheck|payroll|salary|wages)\b/.test(
    normalized
  );
}

function isRecurringDescription(normalized: string) {
  return /\brecurring\b/.test(normalized);
}

export function shouldHardIgnoreImportTransaction(
  description: string,
  direction: ImportTransactionDirection
): boolean {
  const normalized = normalizeImportDescription(description);

  if (!normalized) {
    return false;
  }

  if (hasPayrollSignal(normalized)) {
    return false;
  }

  if (
    /\b(?:zelle|cash app|cashapp|venmo|pmnt sent|pmnt rcvd|payment sent|payment received)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /\b(?:transfer from|transfer to|xfer from|xfer to)\b/.test(normalized) &&
    /\b(?:sav|savings|checking|chk|internal|between accounts)\b/.test(normalized)
  ) {
    return true;
  }

  if (/\balbert corporation\b/.test(normalized)) {
    return true;
  }

  if (
    direction === "debit" &&
    /\b(?:internal transfer|online transfer|bank transfer|funds transfer)\b/.test(
      normalized
    ) &&
    !/\b(?:payroll|salary|wages|direct dep)\b/.test(normalized)
  ) {
    return true;
  }

  if (
    direction === "credit" &&
    /\b(?:transfer from|mobile deposit|ach credit)\b/.test(normalized) &&
    !hasPayrollSignal(normalized)
  ) {
    return true;
  }

  if (
    /\b(?:overdraft fee|overdraft item|debit adjustment|return of posted check|service fee|service charge|duplicate item|duplicate charge|nsf fee|maintenance fee)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    direction === "debit" &&
    /\b(?:crcardpmt|cc payment|credit card payment|card payment|card pmt|autopay card)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    direction === "debit" &&
    /\bcapital one\b/.test(normalized) &&
    /\b(?:crcardpmt|card pmt|credit card)\b/.test(normalized)
  ) {
    return true;
  }

  if (/\b(?:retry pymt|retry payment)\b/.test(normalized)) {
    return true;
  }

  if (
    direction === "debit" &&
    /\bcity of\b/.test(normalized) &&
    !isRecurringDescription(normalized)
  ) {
    return true;
  }

  if (/\bperplexity\b/.test(normalized) && !isRecurringDescription(normalized)) {
    return true;
  }

  return false;
}
