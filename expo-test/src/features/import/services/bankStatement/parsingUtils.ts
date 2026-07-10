import type { ImportSuggestionInterval } from "@/database/repositories/types";

import type { StatementSectionKind } from "./types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseCsvRows(csvText: string) {
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

export function appendCsvRow(rows: string[][], row: string[]) {
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }
}

export function findHeaderIndex(headers: string[], candidates: string[]) {
  const index = headers.findIndex((header) => candidates.includes(header));

  return index < 0 ? null : index;
}

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

export function splitStatementLines(statementText: string) {
  return statementText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function annotateStatementSections(lines: string[]) {
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

export function classifyStatementSectionHeader(value: string): StatementSectionKind | null {
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

export function isStatementTableHeader(value: string) {
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

export function isIgnoredStatementLine(value: string) {
  const normalized = normalizeDescriptionKey(value);

  return /^(?:account summary|average balance|beginning balance|continued|ending balance|interest bearing days|page \d+|summary|total|totals)$/.test(
    normalized
  );
}

export function isSummaryDescription(description: string) {
  const normalized = normalizeDescriptionKey(description);

  return /\b(?:account summary|average balance|beginning balance|ending balance|interest bearing days|summary|total|totals)\b/.test(
    normalized
  );
}

export function containsStatementDate(value: string) {
  return /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)\b/.test(
    value
  );
}

export function isStatementDateLine(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)(?:[\s,]+(.*))?$/
  );

  if (!match) {
    return false;
  }

  const trailingText = match[2]?.trim() ?? "";

  if (!trailingText) {
    return true;
  }

  if (/^#\d/.test(trailingText)) {
    return false;
  }

  return true;
}

export function findMoneyAmounts(line: string) {
  return [...line.matchAll(/[-+]?\(?\$?(?:\d[\d,]*\.\d{2}|\.\d{2})\)?/g)];
}

export function parseMoneyAmountToCents(value: string) {
  const normalized = value
    .trim()
    .replace(/[$,]/g, "")
    .replace(/^\((.+)\)$/, "-$1");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

export function normalizeDate(value: string, inferredYear: number | null = null) {
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

export function formatUtcIsoDate(year: number, month: number, day: number) {
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

export function inferStatementYear(statementText: string) {
  const years = [...statementText.matchAll(/\b(20\d{2}|19\d{2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year >= 2000 && year <= 2100);

  return years[0] ?? new Date().getFullYear();
}

export function sanitizeDescription(value: string) {
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

export function normalizeDescriptionKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function detectInterval(dates: string[]): ImportSuggestionInterval {
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

export function isNearCommonBillingDate(date: string) {
  const day = Number(date.slice(-2));

  return (
    (day >= 1 && day <= 5) ||
    (day >= 14 && day <= 16) ||
    day >= 28
  );
}

export function areSimilarAmounts(firstAmountCents: number, secondAmountCents: number) {
  return (
    Math.abs(firstAmountCents - secondAmountCents) <=
    Math.max(100, Math.round(secondAmountCents * 0.03))
  );
}

export function daysBetween(firstDate: string, secondDate: string) {
  return (
    (parseIsoDate(secondDate).getTime() - parseIsoDate(firstDate).getTime()) /
    (24 * 60 * 60 * 1000)
  );
}

export function parseIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-");

  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}

export function isNear(value: number, target: number, tolerance: number) {
  return Math.abs(value - target) <= tolerance;
}
