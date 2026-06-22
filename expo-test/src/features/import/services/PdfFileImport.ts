import type * as FileSystemModule from "expo-file-system";

import { recognizePdfTextWithNativeOcr } from "./PdfNativeOcr";

export type PickedPdfTextResult =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      extractionMethod: "embedded-text" | "ocr";
      fileName: string;
      ocrText?: string;
      ocrPageCount?: number;
      ocrRecognizedPageCount?: number;
      pdfText: string;
      uri: string;
    };

import { STATEMENT_FILE_PICKER_OPTIONS } from "./statementFilePickerOptions";

export async function pickPdfTextFromDevice(): Promise<PickedPdfTextResult> {
  const { File } = await loadPdfNativeModules();
  const result = await File.pickFileAsync(STATEMENT_FILE_PICKER_OPTIONS);

  if (result.canceled) {
    return { canceled: true };
  }

  const file = result.result;

  try {
    const extractedText = extractTextFromPdfSource(await readPdfSource(file));

    if (extractedText.trim()) {
      const ocrResult = await tryRecognizePdfText(file.uri);

      return {
        canceled: false,
        extractionMethod: "embedded-text",
        fileName: file.name,
        ocrPageCount: ocrResult?.pageCount,
        ocrRecognizedPageCount: ocrResult?.recognizedPageCount,
        ocrText: ocrResult?.text.trim(),
        pdfText: extractedText,
        uri: file.uri,
      };
    }

    const ocrResult = await recognizePdfTextWithNativeOcr(file.uri);

    return {
      canceled: false,
      extractionMethod: "ocr",
      fileName: file.name,
      ocrPageCount: ocrResult.pageCount,
      ocrRecognizedPageCount: ocrResult.recognizedPageCount,
      pdfText: ocrResult.text.trim(),
      uri: file.uri,
    };
  } finally {
    file.delete();
  }
}

async function tryRecognizePdfText(fileUri: string) {
  try {
    return await recognizePdfTextWithNativeOcr(fileUri);
  } catch {
    return null;
  }
}

export function extractTextFromPdfSource(pdfSource: string) {
  if (!pdfSource.includes("%PDF")) {
    return pdfSource.trim();
  }

  return Array.from(extractPdfLiteralStrings(pdfSource))
    .map((value) => normalizePdfText(value))
    .filter((value) => hasStatementLikeText(value))
    .join("\n")
    .trim();
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

async function loadPdfNativeModules(): Promise<{
  File: typeof FileSystemModule.File;
}> {
  try {
    const FileSystem = await import("expo-file-system");

    return {
      File: FileSystem.File,
    };
  } catch {
    throw new Error(
      "PDF import needs a fresh Expo Go reload or a rebuilt development app."
    );
  }
}

async function readPdfSource(file: Pick<FileSystemModule.File, "arrayBuffer" | "text">) {
  if (typeof file.arrayBuffer === "function") {
    return decodeBytesPreservingByteValues(new Uint8Array(await file.arrayBuffer()));
  }

  return file.text();
}

function decodeBytesPreservingByteValues(bytes: Uint8Array) {
  const chunkSize = 8192;
  let output = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    output += String.fromCharCode(
      ...bytes.subarray(index, index + chunkSize)
    );
  }

  return output;
}
