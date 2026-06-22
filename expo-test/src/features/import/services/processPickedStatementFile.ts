import type { ImportSuggestion } from "@/database/repositories/types";
import {
  createStatementImportDiagnostics,
  type StatementImportDiagnostics,
} from "@/features/import/services/CsvImportParser";
import { importExtractedPdfText } from "@/features/import/services/PdfImportAdapter";
import type { ImportService } from "@/features/import/services/ImportService";
import type { PickedStatementFileResult } from "@/features/import/services/StatementFileImport";

type ProcessPickedStatementFileInput = {
  importService: Pick<
    ImportService,
    "getPendingSuggestions" | "importCsvText" | "importStatementText"
  >;
  pickedFile: Exclude<PickedStatementFileResult, { canceled: true }>;
  profileId: string;
};

export type ProcessedStatementImport = {
  importMessage: string;
  suggestions: ImportSuggestion[];
};

export async function processPickedStatementFile({
  importService,
  pickedFile,
  profileId,
}: ProcessPickedStatementFileInput): Promise<ProcessedStatementImport> {
  if (pickedFile.fileKind === "csv") {
    const result = await importService.importCsvText({
      csvText: pickedFile.csvText,
      profileId,
    });
    const pendingSuggestions =
      await importService.getPendingSuggestions(profileId);

    return {
      suggestions: pendingSuggestions,
      importMessage: createStatementImportMessage({
        fileName: pickedFile.fileName,
        importDiagnostics: createStatementImportDiagnostics(pickedFile.csvText, {
          includeSingleOccurrenceCandidates: true,
        }),
        suggestionCount: result.suggestions.length,
      }),
    };
  }

  if (!pickedFile.pdfText.trim()) {
    throw new Error(
      "This PDF did not include readable statement text. Try exporting the statement as CSV or a text-based PDF."
    );
  }

  let activeText = pickedFile.pdfText;
  let activeExtraction = {
    extractionMethod: pickedFile.extractionMethod,
    ocrPageCount: pickedFile.ocrPageCount,
    ocrRecognizedPageCount: pickedFile.ocrRecognizedPageCount,
  };
  let result = await importExtractedPdfText({
    extractedText: pickedFile.pdfText,
    importService,
    profileId,
  });

  if (
    result.suggestions.length === 0 &&
    pickedFile.extractionMethod === "embedded-text" &&
    pickedFile.ocrText?.trim()
  ) {
    const ocrImportResult = await importExtractedPdfText({
      extractedText: pickedFile.ocrText,
      importService,
      profileId,
    });

    if (ocrImportResult.suggestions.length > 0) {
      result = ocrImportResult;
    }

    activeText = pickedFile.ocrText;
    activeExtraction = {
      extractionMethod: "ocr",
      ocrPageCount: pickedFile.ocrPageCount,
      ocrRecognizedPageCount: pickedFile.ocrRecognizedPageCount,
    };
  }

  const pendingSuggestions = await importService.getPendingSuggestions(profileId);

  return {
    suggestions: pendingSuggestions,
    importMessage: createPdfImportMessage({
      extractionMethod: activeExtraction.extractionMethod,
      fileName: pickedFile.fileName,
      importDiagnostics: createStatementImportDiagnostics(activeText),
      ocrPageCount: activeExtraction.ocrPageCount,
      ocrRecognizedPageCount: activeExtraction.ocrRecognizedPageCount,
      suggestionCount: result.suggestions.length,
    }),
  };
}

function createStatementImportMessage({
  fileName,
  importDiagnostics,
  suggestionCount,
}: {
  fileName: string;
  importDiagnostics: StatementImportDiagnostics;
  suggestionCount: number;
}) {
  const suggestionLabel =
    suggestionCount === 1
      ? `Imported 1 suggestion from ${fileName}.`
      : `Imported ${suggestionCount} suggestions from ${fileName}.`;

  return `${suggestionLabel}${formatImportDiagnostics(importDiagnostics)}`;
}

function createPdfImportMessage({
  extractionMethod,
  fileName,
  importDiagnostics,
  ocrPageCount,
  ocrRecognizedPageCount,
  suggestionCount,
}: {
  extractionMethod: "embedded-text" | "ocr";
  fileName: string;
  importDiagnostics?: StatementImportDiagnostics;
  ocrPageCount?: number;
  ocrRecognizedPageCount?: number;
  suggestionCount: number;
}) {
  if (suggestionCount === 0) {
    const diagnosticsLabel = formatImportDiagnostics(importDiagnostics);

    if (extractionMethod === "ocr") {
      return `OCR scanned ${formatOcrPageCount(ocrRecognizedPageCount, ocrPageCount)} in ${fileName}, but no bill candidates matched yet.${diagnosticsLabel}`;
    }

    return `No bill candidates were found in ${fileName}. Readable PDF text was found, but no bill rows matched.${diagnosticsLabel}`;
  }

  const sourceLabel =
    extractionMethod === "ocr"
      ? ` using OCR on ${formatOcrPageCount(ocrRecognizedPageCount, ocrPageCount)}`
      : "";

  return suggestionCount === 1
    ? `Imported 1 suggestion from ${fileName}${sourceLabel}.`
    : `Imported ${suggestionCount} suggestions from ${fileName}${sourceLabel}.`;
}

function formatImportDiagnostics(
  importDiagnostics?: StatementImportDiagnostics
) {
  if (!importDiagnostics) {
    return "";
  }

  const transactionSample = formatImportTransactionSamples(importDiagnostics);
  const ignoredLabel =
    importDiagnostics.ignoredOrdinarySpendingCount > 0
      ? ` Ignored ${importDiagnostics.ignoredOrdinarySpendingCount} ordinary purchases.`
      : "";

  return ` Parser saw ${importDiagnostics.parsedTransactionCount} transactions: ${importDiagnostics.debitTransactionCount} debit, ${importDiagnostics.creditTransactionCount} credit.${ignoredLabel} Found ${importDiagnostics.lineCount} text lines, ${importDiagnostics.dateLineCount} date lines, and ${importDiagnostics.amountLineCount} amount lines.${transactionSample}`;
}

function formatImportTransactionSamples(
  importDiagnostics: StatementImportDiagnostics
) {
  if (importDiagnostics.transactionSamples.length === 0) {
    return "";
  }

  const samples = importDiagnostics.transactionSamples
    .map(
      (sample) =>
        `${sample.transactionType === "credit" ? "Credit" : "Debit"} ${sample.date} ${sample.merchant} ${formatDiagnosticAmount(sample.amountCents)}`
    )
    .join("; ");

  return ` Sample: ${samples}.`;
}

function formatDiagnosticAmount(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function formatOcrPageCount(recognizedPageCount = 0, pageCount = 0) {
  if (pageCount <= 0) {
    return "the PDF";
  }

  return recognizedPageCount === pageCount
    ? `${pageCount} pages`
    : `${recognizedPageCount} of ${pageCount} pages`;
}
