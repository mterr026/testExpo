import type { ImportService } from "./ImportService";

type PdfTextImportInput = {
  extractedText: string;
  importService: Pick<ImportService, "importStatementText">;
  profileId: string;
};

export async function importExtractedPdfText({
  extractedText,
  importService,
  profileId,
}: PdfTextImportInput) {
  if (!profileId.trim()) {
    throw new Error("PDF import requires a profileId.");
  }

  if (!extractedText.trim()) {
    throw new Error("PDF import requires extracted text.");
  }

  return importService.importStatementText({
    includeSingleOccurrenceCandidates: true,
    parseAsStatementText: true,
    profileId,
    statementText: extractedText,
  });
}
