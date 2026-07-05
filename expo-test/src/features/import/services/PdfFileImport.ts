import type * as FileSystemModule from "expo-file-system";

import { extractTextFromPdfSource } from "./PdfTextExtraction";
import { recognizePdfTextWithNativeOcr } from "./PdfNativeOcr";

export { extractTextFromPdfSource } from "./PdfTextExtraction";

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
