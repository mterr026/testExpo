export type Cents = number;

const DOLLAR_INPUT_PATTERN = /^\s*\$?(\d+)(?:\.(\d{0,2}))?\s*$/;

export function assertCents(value: number, label = "amount"): asserts value is Cents {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be stored as integer cents.`);
  }
}

export function isPositiveCents(value: number): value is Cents {
  return Number.isInteger(value) && value > 0;
}

export function parseDollarInputToCents(input: string): Cents | null {
  return parseDollarInput(input, false);
}

export function parseDollarInputToNonNegativeCents(input: string): Cents | null {
  return parseDollarInput(input, true);
}

function parseDollarInput(input: string, allowZero: boolean): Cents | null {
  const match = input.match(DOLLAR_INPUT_PATTERN);

  if (!match) {
    return null;
  }

  const dollars = Number(match[1]);
  const centsText = (match[2] ?? "").padEnd(2, "0");
  const cents = Number(centsText);
  const total = dollars * 100 + cents;

  if (!Number.isInteger(total)) {
    return null;
  }

  return total > 0 || (allowZero && total === 0) ? total : null;
}

export function formatCurrency(cents: Cents, currency = "USD") {
  assertCents(cents);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
