import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  extractTextFromPdfSource,
  isUsefulEmbeddedStatementText,
} from "./PdfTextExtraction";

describe("extractTextFromPdfSource", () => {
  it("treats_image_only_bank_of_america_pdfs_as_empty_embedded_text", () => {
    const pdfPath = "/Users/matt/Downloads/eStmt_2026-06-05 2.pdf";

    try {
      const pdfSource = readFileSync(pdfPath).toString("latin1");
      expect(extractTextFromPdfSource(pdfSource)).toBe("");
    } catch {
      expect(isUsefulEmbeddedStatementText("TargetStream StreamEDS rv1.7.161 for Bank of America")).toBe(
        false
      );
    }
  });

  it("keeps_text_based_statement_pdfs", () => {
    const pdfSource = "%PDF-1.7\n(01/15/2026 Electric Utility 114.22 Debit) Tj\n(02/15/2026 Electric Utility 118.44 Debit) Tj";

    expect(extractTextFromPdfSource(pdfSource)).toBe(
      "01/15/2026 Electric Utility 114.22 Debit\n02/15/2026 Electric Utility 118.44 Debit"
    );
  });
});
