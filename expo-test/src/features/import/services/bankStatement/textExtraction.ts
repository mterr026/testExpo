import {
  annotateStatementSections,
  classifyStatementSectionHeader,
  containsStatementDate,
  findMoneyAmounts,
  inferStatementYear,
  isIgnoredStatementLine,
  isStatementDateLine,
  isStatementTableHeader,
  isSummaryDescription,
  normalizeDate,
  normalizeDescriptionKey,
  parseMoneyAmountToCents,
  sanitizeDescription,
  splitStatementLines,
} from "./parsingUtils";
import { createTransaction } from "./transactions";
import type { NormalizedTransaction, StatementRow, StatementSectionKind } from "./types";
import {
  isCreditText,
  isDebitText,
  isLikelyBillDescription,
  isLikelyIncomeDescription,
  isLikelyOrdinarySpendingDescription,
} from "./suggestions";

export function extractTextTransactions(
  statementText: string,
  source: NormalizedTransaction["source"]
) {
  const inferredYear = inferStatementYear(statementText);
  const annotatedLines = annotateStatementSections(splitStatementLines(statementText));
  const rows = stitchOrphanDescriptionAmounts(
    buildStatementRows(annotatedLines),
    annotatedLines
  );
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
  const rows: StatementRow[] = [];
  let currentParts: string[] = [];
  let currentSectionKind: StatementSectionKind = "unknown";
  let currentStartLineIndex = 0;
  let lineIndex = 0;

  while (lineIndex < annotatedLines.length) {
    const { line, sectionKind } = annotatedLines[lineIndex];

    if (isStatementTableHeader(line) || isIgnoredStatementLine(line)) {
      lineIndex += 1;
      continue;
    }

    if (isStatementDateLine(line)) {
      if (currentParts.length > 0) {
        const detachedAmount = attachDetachedAmountLine(
          annotatedLines,
          lineIndex,
          currentParts
        );

        appendStatementRow(
          rows,
          detachedAmount.parts,
          currentSectionKind,
          currentStartLineIndex
        );
        lineIndex += detachedAmount.skipLines;
      }

      currentParts = [line];
      currentSectionKind = sectionKind;
      currentStartLineIndex = lineIndex;
      lineIndex += 1;
      continue;
    }

    if (currentParts.length === 0) {
      lineIndex += 1;
      continue;
    }

    currentParts.push(line);

    if (findMoneyAmounts(line).length >= 1) {
      appendStatementRow(rows, currentParts, currentSectionKind, currentStartLineIndex);
      currentParts = [];
    }

    lineIndex += 1;
  }

  if (currentParts.length > 0) {
    const detachedAmount = attachDetachedAmountLine(
      annotatedLines,
      lineIndex,
      currentParts
    );

    appendStatementRow(
      rows,
      detachedAmount.parts,
      currentSectionKind,
      currentStartLineIndex
    );
  }

  return rows;
}

function stitchOrphanDescriptionAmounts(
  rows: StatementRow[],
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[]
) {
  if (rows.length === 0) {
    return rows;
  }

  const stitchedRows = rows.map((row) => ({ ...row }));
  const pairedRowIndices = new Set<number>();

  for (const block of findContiguousStandaloneAmountBlocks(annotatedLines)) {
    const orphanRuns = collectOrphanRunsBeforeBlock(
      stitchedRows,
      block.startLineIndex,
      pairedRowIndices,
      annotatedLines
    );
    const orphanCount = orphanRuns.reduce((count, run) => count + run.length, 0);

    if (orphanCount > 0) {
      pairOrphanRunsWithAmounts(
        stitchedRows,
        orphanRuns,
        block.amounts.slice(0, orphanCount),
        pairedRowIndices
      );
    }
  }

  return stitchedRows;
}

function collectOrphanRunsBeforeBlock(
  rows: StatementRow[],
  beforeLineIndex: number,
  pairedRowIndices: Set<number>,
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[]
) {
  const sectionStartLineIndex = findOrphanCollectionStartLineIndex(
    annotatedLines,
    beforeLineIndex
  );
  const orderedIndices = rows
    .map((row, index) => ({ index, row }))
    .filter(
      ({ index, row }) =>
        row.startLineIndex >= sectionStartLineIndex &&
        row.startLineIndex < beforeLineIndex &&
        !pairedRowIndices.has(index)
    )
    .sort((first, second) => first.row.startLineIndex - second.row.startLineIndex)
    .map(({ index }) => index);
  const runs: number[][] = [];
  let currentRun: number[] = [];

  for (const index of orderedIndices) {
    if (isTwoColumnOrphanCandidate(rows[index].line)) {
      currentRun.push(index);
      continue;
    }

    if (currentRun.length > 0) {
      runs.push(currentRun);
      currentRun = [];
    }
  }

  if (currentRun.length > 0) {
    runs.push(currentRun);
  }

  return selectOrphanRunsForAmountBlock(runs, beforeLineIndex, rows, annotatedLines);
}

function findOrphanCollectionStartLineIndex(
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[],
  beforeLineIndex: number
) {
  for (let index = beforeLineIndex - 1; index >= 0; index -= 1) {
    const line = annotatedLines[index].line;

    if (isStatementTableHeader(line)) {
      return index;
    }

    if (isStatementSectionHeaderLine(line)) {
      return index;
    }

    if (isStatementSectionBoundaryLine(line)) {
      continue;
    }
  }

  return 0;
}

function isStatementSectionHeaderLine(line: string) {
  if (
    containsStatementDate(line) ||
    findMoneyAmounts(line).length > 0 ||
    isStatementTableHeader(line)
  ) {
    return false;
  }

  return classifyStatementSectionHeader(line) != null;
}

function selectOrphanRunsForAmountBlock(
  orphanRuns: number[][],
  beforeLineIndex: number,
  rows: StatementRow[],
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[]
) {
  const flattened = orphanRuns.flat();
  const totalOrphans = flattened.length;

  if (totalOrphans === 0) {
    return [];
  }

  const block = findContiguousStandaloneAmountBlocks(annotatedLines).find(
    (candidate) => candidate.startLineIndex === beforeLineIndex
  );

  if (!block) {
    return orphanRuns;
  }

  const debitOrphans = flattened.filter((rowIndex) => {
    const description = rows[rowIndex].line.replace(
      /^\s*(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)\s*/,
      ""
    );

    return !isLikelyIncomeDescription(description);
  });
  const blockIsDebit = block.amounts.every((amount) =>
    isDebitStandaloneAmountLine(amount)
  );
  const candidateOrphans = blockIsDebit ? debitOrphans : flattened;

  if (candidateOrphans.length === block.amounts.length) {
    return [candidateOrphans];
  }

  const strongOrphanIndices = candidateOrphans.filter((rowIndex) =>
    hasStrongStitchSignal(rows[rowIndex].line)
  );

  if (strongOrphanIndices.length === block.amounts.length) {
    return [strongOrphanIndices];
  }

  if (candidateOrphans.length > block.amounts.length) {
    if (strongOrphanIndices.length >= block.amounts.length) {
      return [strongOrphanIndices.slice(0, block.amounts.length)];
    }

    return [candidateOrphans.slice(0, block.amounts.length)];
  }

  if (strongOrphanIndices.length > 0 && strongOrphanIndices.length <= block.amounts.length) {
    return [strongOrphanIndices];
  }

  return [];
}

function hasStrongStitchSignal(line: string) {
  if (!isDescriptionOnlyStatementRow(line)) {
    return false;
  }

  const normalized = normalizeDescriptionKey(line);

  return (
    /\b(?:checkcard|direct debit|electric|elec pymt|internet|netflix|power|recurring|rent|subscription|utility|water|wireless)\b/.test(
      normalized
    ) || isLikelyBillDescription(line)
  );
}

function pairOrphanRunsWithAmounts(
  rows: StatementRow[],
  orphanRuns: number[][],
  amounts: string[],
  pairedRowIndices: Set<number>
) {
  let amountOffset = 0;

  for (const run of orphanRuns) {
    if (amountOffset + run.length > amounts.length) {
      return;
    }

    for (const rowIndex of run) {
      rows[rowIndex] = {
        ...rows[rowIndex],
        line: stripTrailingStandaloneAmount(rows[rowIndex].line),
      };
    }

    for (let index = 0; index < run.length; index += 1) {
      const rowIndex = run[index];

      if (pairedRowIndices.has(rowIndex)) {
        continue;
      }

      rows[rowIndex] = {
        ...rows[rowIndex],
        line: `${rows[rowIndex].line} ${amounts[amountOffset + index]}`,
      };
      pairedRowIndices.add(rowIndex);
    }

    amountOffset += run.length;
  }
}

function findContiguousStandaloneAmountBlocks(
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[]
) {
  const blocks: {
    amounts: string[];
    endLineIndex: number;
    startLineIndex: number;
  }[] = [];
  let amounts: string[] = [];
  let startLineIndex = -1;
  let endLineIndex = -1;

  const flush = () => {
    if (amounts.length < 2) {
      amounts = [];
      startLineIndex = -1;
      endLineIndex = -1;
      return;
    }

    blocks.push({
      amounts: amounts.map((amount) => amount.replace(/^\$/, "")),
      endLineIndex,
      startLineIndex,
    });
    amounts = [];
    startLineIndex = -1;
    endLineIndex = -1;
  };

  for (let index = 0; index < annotatedLines.length; index += 1) {
    const line = annotatedLines[index].line;

    if (
      isStatementTableHeader(line) ||
      isIgnoredStatementLine(line) ||
      isStatementSectionBoundaryLine(line)
    ) {
      flush();
      continue;
    }

    if (isStatementDateLine(line)) {
      flush();
      continue;
    }

    if (isStandaloneAmountLine(line) && isDebitStandaloneAmountLine(line)) {
      if (isSectionAggregateTotalAmountLine(annotatedLines, index)) {
        flush();
        continue;
      }

      if (amounts.length === 0) {
        startLineIndex = index;
      }

      amounts.push(line.trim());
      endLineIndex = index;
      continue;
    }

    if (isStandaloneAmountBlockNoiseLine(line)) {
      endLineIndex = index;
      continue;
    }

    flush();
  }

  flush();

  return blocks;
}

function isDescriptionOnlyStatementRow(line: string) {
  const dateMatch = line.match(
    /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)\b/
  );

  if (!dateMatch || dateMatch.index == null) {
    return false;
  }

  const dateIndex = dateMatch.index;

  return (
    findMoneyAmounts(line).filter(
      (match) => match.index != null && match.index > dateIndex
    ).length === 0
  );
}

function isTwoColumnOrphanCandidate(line: string) {
  if (isDescriptionOnlyStatementRow(line)) {
    return true;
  }

  return stripTrailingStandaloneAmount(line) !== line;
}

function stripTrailingStandaloneAmount(line: string) {
  const amounts = findMoneyAmounts(line);

  if (amounts.length === 0) {
    return line;
  }

  const lastAmount = amounts[amounts.length - 1];

  if (lastAmount.index == null) {
    return line;
  }

  const trailingText = line.slice(lastAmount.index + lastAmount[0].length).trim();

  if (trailingText.length > 0) {
    return line;
  }

  const dateMatch = line.match(
    /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/(?:\d{2}|\d{4}))?)\b/
  );

  if (!dateMatch || dateMatch.index == null || lastAmount.index <= dateMatch.index) {
    return line;
  }

  if (!isStandaloneAmountLine(lastAmount[0])) {
    return line;
  }

  return line.slice(0, lastAmount.index).trim();
}

function isStandaloneAmountBlockNoiseLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed || isStandaloneAmountLine(trimmed) || isStatementDateLine(trimmed)) {
    return false;
  }

  if (findMoneyAmounts(trimmed).length > 0) {
    return false;
  }

  if (/^-\$[\d,]+\.\d{2}$/.test(trimmed.replace(/\s/g, ""))) {
    return true;
  }

  if (/\d{10,}/.test(trimmed)) {
    return true;
  }

  const normalized = normalizeDescriptionKey(trimmed);

  if (/^(?:co|fl|ca|tx|dc|web|ppd|id|indn|des|sunrise|tamarac)$/.test(normalized)) {
    return true;
  }

  if (/^[a-z]{2}$/.test(trimmed)) {
    return true;
  }

  if (normalized.length <= 3) {
    return true;
  }

  if (
    /^(?:continued on the next page|fort lauderda|mountain view|coral spring)/.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /^total (?:atm and debit card subtractions|deposits and other additions|other subtractions)/.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

function isSectionAggregateTotalAmountLine(
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[],
  lineIndex: number
) {
  const line = annotatedLines[lineIndex]?.line;

  if (
    !line ||
    !isStandaloneAmountLine(line) ||
    !isDebitStandaloneAmountLine(line)
  ) {
    return false;
  }

  for (
    let index = lineIndex - 1;
    index >= Math.max(0, lineIndex - 5);
    index -= 1
  ) {
    const previousLine = annotatedLines[index].line;

    if (isStandaloneAmountLine(previousLine)) {
      break;
    }

    if (isStandaloneAmountBlockNoiseLine(previousLine)) {
      const normalized = normalizeDescriptionKey(previousLine);

      if (/^total (?:atm and debit card subtractions|deposits and other additions|other subtractions)/.test(normalized)) {
        return true;
      }
    }
  }

  return false;
}

function isStatementSectionBoundaryLine(line: string) {
  if (containsStatementDate(line)) {
    return false;
  }

  const normalized = normalizeDescriptionKey(line);

  return (
    /^page \d+ of \d+$/.test(normalized) ||
    /\bcontinued on the next page\b/.test(normalized) ||
    /^total(?: for this period| year to date| overdraft fees)?$/.test(normalized) ||
    /^total (?:service fees|nsf)/.test(normalized) ||
    (/\b(?:deposits and other|withdrawals and other|other subtractions)\b/.test(
      normalized
    ) &&
      /\bcontinued\b/.test(normalized))
  );
}

function isDebitStandaloneAmountLine(line: string) {
  const trimmed = line.trim();

  if (/^\(.+\)$/.test(trimmed)) {
    return true;
  }

  return /^-/.test(trimmed.replace(/\$/g, ""));
}

function attachDetachedAmountLine(
  annotatedLines: {
    line: string;
    sectionKind: StatementSectionKind;
  }[],
  fromIndex: number,
  parts: string[]
) {
  const joinedParts = parts.join(" ");

  if (findMoneyAmounts(joinedParts).length >= 1) {
    return { parts, skipLines: 0 };
  }

  let startOffset = 0;

  if (
    fromIndex < annotatedLines.length &&
    isStatementDateLine(annotatedLines[fromIndex].line)
  ) {
    startOffset = 1;
  }

  for (
    let offset = startOffset;
    offset < 80 && fromIndex + offset < annotatedLines.length;
    offset += 1
  ) {
    const candidateLine = annotatedLines[fromIndex + offset].line;

    if (isStatementDateLine(candidateLine)) {
      break;
    }

    if (
      isStatementTableHeader(candidateLine) ||
      isIgnoredStatementLine(candidateLine) ||
      isStatementSectionBoundaryLine(candidateLine)
    ) {
      continue;
    }

    if (isStandaloneAmountLine(candidateLine)) {
      if (
        isSectionAggregateTotalAmountLine(annotatedLines, fromIndex + offset)
      ) {
        continue;
      }

      return {
        parts: [...parts, candidateLine],
        skipLines: offset + 1,
      };
    }

    if (!isStandaloneAmountBlockNoiseLine(candidateLine)) {
      break;
    }
  }

  return { parts, skipLines: 0 };
}

function isStandaloneAmountLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed || containsStatementDate(trimmed)) {
    return false;
  }

  const amounts = findMoneyAmounts(trimmed);

  if (amounts.length !== 1) {
    return false;
  }

  const normalizedLine = trimmed.replace(/\$/g, "").trim();

  return /^[-+]?(?:\d[\d,]*\.\d{2}|\.\d{2})$/.test(normalizedLine);
}

function appendStatementRow(
  rows: StatementRow[],
  parts: string[],
  sectionKind: StatementSectionKind,
  startLineIndex: number
) {
  if (parts.length === 0) {
    return;
  }

  rows.push({
    line: parts.join(" "),
    sectionKind,
    startLineIndex,
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
