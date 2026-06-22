import { describe, expect, it } from "vitest";

import {
  isCsvFile,
  isPdfFile,
  resolveStatementFileKind,
  STATEMENT_FILE_PICKER_OPTIONS,
} from "./statementFilePickerOptions";

describe("STATEMENT_FILE_PICKER_OPTIONS", () => {
  it("allows_any_document_type_so_ios_files_shows_pdfs", () => {
    expect(STATEMENT_FILE_PICKER_OPTIONS).toEqual({
      mimeTypes: "*/*",
      multipleFiles: false,
    });
  });
});

describe("isPdfFile", () => {
  it("accepts_pdf_extensions_and_mime_types", () => {
    expect(
      isPdfFile({
        name: "statement.pdf",
        mimeType: "application/octet-stream",
      })
    ).toBe(true);
    expect(
      isPdfFile({
        name: "statement",
        mimeType: "application/pdf",
      })
    ).toBe(true);
  });
});

describe("resolveStatementFileKind", () => {
  it("detects_pdfs_from_magic_bytes_when_metadata_is_missing", async () => {
    const file = {
      arrayBuffer: async () =>
        Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]).buffer,
      name: "bank-statement",
      mimeType: "application/octet-stream",
      text: async () => "",
    };

    await expect(resolveStatementFileKind(file as never)).resolves.toBe("pdf");
  });

  it("detects_csv_from_extension_and_content", async () => {
    const file = {
      arrayBuffer: async () => new TextEncoder().encode("Date,Description,Amount\n").buffer,
      name: "statement.csv",
      mimeType: "application/octet-stream",
      text: async () => "Date,Description,Amount\n2026-01-05,Utility,-12.99",
    };

    await expect(resolveStatementFileKind(file as never)).resolves.toBe("csv");
  });

  it("returns_unknown_for_unsupported_files", async () => {
    const file = {
      arrayBuffer: async () => new TextEncoder().encode("hello").buffer,
      name: "notes.txt",
      mimeType: "text/plain",
      text: async () => "hello",
    };

    await expect(resolveStatementFileKind(file as never)).resolves.toBe("unknown");
  });
});

describe("isCsvFile", () => {
  it("accepts_csv_extensions_and_mime_types", () => {
    expect(
      isCsvFile({
        name: "statement.csv",
        mimeType: "application/octet-stream",
      })
    ).toBe(true);
  });
});
