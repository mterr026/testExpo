import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractTextFromPdfSource,
  pickPdfTextFromDevice,
} from "./PdfFileImport";

const pickFileAsync = vi.fn();
const nativeOcrMock = vi.hoisted(() => ({
  recognizePdfTextWithNativeOcr: vi.fn(),
}));

vi.mock("expo-file-system", () => ({
  File: {
    pickFileAsync,
  },
}));
vi.mock("./PdfNativeOcr", () => ({
  recognizePdfTextWithNativeOcr: nativeOcrMock.recognizePdfTextWithNativeOcr,
}));

describe("pickPdfTextFromDevice", () => {
  beforeEach(() => {
    pickFileAsync.mockReset();
    nativeOcrMock.recognizePdfTextWithNativeOcr.mockReset();
  });

  it("returns_canceled_when_the_file_picker_is_canceled", async () => {
    pickFileAsync.mockResolvedValue({
      canceled: true,
    });

    await expect(pickPdfTextFromDevice()).resolves.toEqual({
      canceled: true,
    });
    expect(pickFileAsync).toHaveBeenCalledWith({
      mimeTypes: "*/*",
      multipleFiles: false,
    });
  });

  it("reads_text_from_the_picked_pdf_and_deletes_the_cache_copy", async () => {
    const pdfSource = "%PDF-1.7\n(01/15/2026 Electric Utility 114.22 Debit) Tj";
    const file = {
      arrayBuffer: vi
        .fn()
        .mockResolvedValue(encodeBytePreservingString(pdfSource).buffer),
      delete: vi.fn(),
      name: "statement.pdf",
      uri: "file:///statement.pdf",
      text: vi.fn(),
    };

    pickFileAsync.mockResolvedValue({
      canceled: false,
      result: file,
    });
    nativeOcrMock.recognizePdfTextWithNativeOcr.mockResolvedValue({
      pageCount: 2,
      recognizedPageCount: 2,
      text: "01/15/2026 Electric Utility 114.22 Debit",
    });

    await expect(pickPdfTextFromDevice()).resolves.toEqual({
      canceled: false,
      extractionMethod: "embedded-text",
      fileName: "statement.pdf",
      ocrPageCount: 2,
      ocrRecognizedPageCount: 2,
      ocrText: "01/15/2026 Electric Utility 114.22 Debit",
      pdfText: "01/15/2026 Electric Utility 114.22 Debit",
      uri: "file:///statement.pdf",
    });
    expect(file.arrayBuffer).toHaveBeenCalledOnce();
    expect(file.text).not.toHaveBeenCalled();
    expect(nativeOcrMock.recognizePdfTextWithNativeOcr).toHaveBeenCalledWith(
      "file:///statement.pdf"
    );
    expect(file.delete).toHaveBeenCalledOnce();
  });

  it("falls_back_to_text_when_array_buffer_reading_is_unavailable", async () => {
    const file = {
      delete: vi.fn(),
      name: "statement.pdf",
      uri: "file:///statement.pdf",
      text: vi
        .fn()
        .mockResolvedValue(
          "%PDF-1.7\n(02/15/2026 Water Utility 48.25 Debit) Tj"
        ),
    };

    pickFileAsync.mockResolvedValue({
      canceled: false,
      result: file,
    });

    await expect(pickPdfTextFromDevice()).resolves.toEqual({
      canceled: false,
      extractionMethod: "embedded-text",
      fileName: "statement.pdf",
      pdfText: "02/15/2026 Water Utility 48.25 Debit",
      uri: "file:///statement.pdf",
    });
    expect(file.text).toHaveBeenCalledOnce();
    expect(file.delete).toHaveBeenCalledOnce();
  });

  it("still_imports_embedded_text_when_native_ocr_retry_is_unavailable", async () => {
    const pdfSource = "%PDF-1.7\n(01/15/2026 Electric Utility 114.22 Debit) Tj";
    const file = {
      arrayBuffer: vi
        .fn()
        .mockResolvedValue(encodeBytePreservingString(pdfSource).buffer),
      delete: vi.fn(),
      name: "statement.pdf",
      uri: "file:///statement.pdf",
      text: vi.fn(),
    };

    pickFileAsync.mockResolvedValue({
      canceled: false,
      result: file,
    });
    nativeOcrMock.recognizePdfTextWithNativeOcr.mockRejectedValue(
      new Error("OCR unavailable")
    );

    await expect(pickPdfTextFromDevice()).resolves.toEqual({
      canceled: false,
      extractionMethod: "embedded-text",
      fileName: "statement.pdf",
      pdfText: "01/15/2026 Electric Utility 114.22 Debit",
      uri: "file:///statement.pdf",
    });
    expect(file.delete).toHaveBeenCalledOnce();
  });

  it("falls_back_to_native_ocr_when_pdf_text_extraction_finds_no_text", async () => {
    const file = {
      arrayBuffer: vi
        .fn()
        .mockResolvedValue(encodeBytePreservingString("%PDF-1.7").buffer),
      delete: vi.fn(),
      name: "statement.pdf",
      uri: "file:///statement.pdf",
      text: vi.fn(),
    };

    pickFileAsync.mockResolvedValue({
      canceled: false,
      result: file,
    });
    nativeOcrMock.recognizePdfTextWithNativeOcr.mockResolvedValue({
      pageCount: 2,
      recognizedPageCount: 2,
      text: "01/15/2026 Electric Utility 114.22 Debit",
    });

    await expect(pickPdfTextFromDevice()).resolves.toEqual({
      canceled: false,
      extractionMethod: "ocr",
      fileName: "statement.pdf",
      ocrPageCount: 2,
      ocrRecognizedPageCount: 2,
      pdfText: "01/15/2026 Electric Utility 114.22 Debit",
      uri: "file:///statement.pdf",
    });
    expect(nativeOcrMock.recognizePdfTextWithNativeOcr).toHaveBeenCalledWith(
      "file:///statement.pdf"
    );
    expect(file.delete).toHaveBeenCalledOnce();
  });

  it("deletes_the_cache_copy_when_pdf_reading_fails", async () => {
    const file = {
      arrayBuffer: vi.fn().mockRejectedValue(new Error("read failed")),
      delete: vi.fn(),
      name: "statement.pdf",
      uri: "file:///statement.pdf",
      text: vi.fn(),
    };

    pickFileAsync.mockResolvedValue({
      canceled: false,
      result: file,
    });

    await expect(pickPdfTextFromDevice()).rejects.toThrow("read failed");
    expect(file.delete).toHaveBeenCalledOnce();
  });
});

describe("extractTextFromPdfSource", () => {
  it("keeps_plain_text_when_the_file_reader_already_returns_text", () => {
    expect(
      extractTextFromPdfSource("01/15/2026 Electric Utility 114.22 Debit")
    ).toBe("01/15/2026 Electric Utility 114.22 Debit");
  });

  it("extracts_statement_like_literal_strings_from_text_based_pdf_source", () => {
    expect(
      extractTextFromPdfSource(
        "%PDF-1.7\n(Header) Tj\n(02/15/2026 Water Utility 48.25 Debit) Tj"
      )
    ).toBe("02/15/2026 Water Utility 48.25 Debit");
  });
});

function encodeBytePreservingString(value: string) {
  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }

  return bytes;
}
