export function extractTextFromPdfSource(pdfSource: string) {
  if (!pdfSource.includes("%PDF")) {
    return pdfSource.trim();
  }

  const extracted = Array.from(extractPdfLiteralStrings(pdfSource))
    .map((value) => normalizePdfText(value))
    .filter((value) => hasStatementLikeText(value))
    .join("\n")
    .trim();

  return isUsefulEmbeddedStatementText(extracted) ? extracted : "";
}

export function isUsefulEmbeddedStatementText(text: string) {
  if (!text.trim()) {
    return false;
  }

  const transactionLikeLineCount = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(
      (line) =>
        /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) && /-?\d+\.\d{2}/.test(line)
    ).length;

  if (transactionLikeLineCount >= 1) {
    return true;
  }

  if (text.length < 200) {
    return false;
  }

  return /\b(?:CHECKCARD|PAYROLL|WITHDRAWAL|DEPOSIT|ZELLE|TRANSFER)\b/i.test(text);
}

function* extractPdfLiteralStrings(pdfSource: string) {
  const literalStringPattern = /\((?:\\.|[^\\)])*\)/g;

  for (const match of pdfSource.matchAll(literalStringPattern)) {
    yield decodePdfLiteralString(match[0].slice(1, -1));
  }
}

function decodePdfLiteralString(value: string) {
  return value
    .replaceAll("\\(", "(")
    .replaceAll("\\)", ")")
    .replaceAll("\\\\", "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ");
}

function normalizePdfText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hasStatementLikeText(value: string) {
  return (
    /[A-Za-z]{3,}/.test(value) &&
    (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(value) ||
      /\d+\.\d{2}/.test(value) ||
      /\b(debit|credit|payment|utility|bill|autopay)\b/i.test(value))
  );
}
