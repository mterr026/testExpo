import type * as FileSystemModule from "expo-file-system";

import {
  extractTextFromPdfSource,
  type PickedPdfTextResult,
} from "./PdfFileImport";
import { recognizePdfTextWithNativeOcr } from "./PdfNativeOcr";
import {
  resolveStatementFileKind,
  STATEMENT_FILE_PICKER_OPTIONS,
} from "./statementFilePickerOptions";

export type PickedStatementFileResult =
  | {
      canceled: true;
    }
  | ({
      canceled: false;
      fileKind: "csv";
      csvText: string;
      fileName: string;
    })
  | ({
      canceled: false;
      fileKind: "pdf";
    } & Omit<Extract<PickedPdfTextResult, { canceled: false }>, "canceled">);

export type PickedStatementFileHandle =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      file: PickedFile;
    };

type PickedFile = Pick<
  FileSystemModule.File,
  "arrayBuffer" | "delete" | "name" | "text" | "uri"
> & {
  mimeType?: string | null;
};

export async function pickStatementFileFromDevice(): Promise<PickedStatementFileResult> {
  const pickedFile = await pickStatementFileOnly();

  if (pickedFile.canceled) {
    return pickedFile;
  }

  return readPickedStatementFile(pickedFile.file);
}

export async function pickStatementFileOnly(): Promise<PickedStatementFileHandle> {
  const { File } = await loadStatementNativeModules();
  const result = await File.pickFileAsync(STATEMENT_FILE_PICKER_OPTIONS);

  if (result.canceled) {
    return { canceled: true };
  }

  return {
    canceled: false,
    file: result.result as PickedFile,
  };
}

export async function readPickedStatementFile(
  file: PickedFile
): Promise<Exclude<PickedStatementFileResult, { canceled: true }>> {
  try {
    const fileKind = await resolveStatementFileKind(file);

    if (fileKind === "pdf") {
      return {
        canceled: false,
        fileKind: "pdf",
        ...(await readPickedPdfFile(file)),
      };
    }

    if (fileKind === "csv") {
      return {
        canceled: false,
        csvText: await file.text(),
        fileKind: "csv",
        fileName: file.name,
      };
    }

    throw new Error(
      "Choose a CSV or PDF bank statement. Other file types are not supported yet."
    );
  } finally {
    file.delete();
  }
}

async function readPickedPdfFile(file: PickedFile) {
  const extractedText = extractTextFromPdfSource(await readPdfSource(file));

  if (extractedText.trim()) {
    const ocrResult = await tryRecognizePdfText(file.uri);

    return {
      extractionMethod: "embedded-text" as const,
      fileName: file.name,
      ocrPageCount: ocrResult?.pageCount,
      ocrRecognizedPageCount: ocrResult?.recognizedPageCount,
      ocrText: ocrResult?.text.trim(),
      pdfText: extractedText,
      uri: file.uri,
    };
  }

  try {
    const ocrResult = await recognizePdfTextWithNativeOcr(file.uri);

    return {
      extractionMethod: "ocr" as const,
      fileName: file.name,
      ocrPageCount: ocrResult.pageCount,
      ocrRecognizedPageCount: ocrResult.recognizedPageCount,
      pdfText: ocrResult.text.trim(),
      uri: file.uri,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "This PDF could not be read. Try exporting the statement as CSV or a text-based PDF."
    );
  }
}

async function tryRecognizePdfText(fileUri: string) {
  try {
    return await recognizePdfTextWithNativeOcr(fileUri);
  } catch {
    return null;
  }
}

async function loadStatementNativeModules(): Promise<{
  File: typeof FileSystemModule.File;
}> {
  try {
    const FileSystem = await import("expo-file-system");

    return {
      File: FileSystem.File,
    };
  } catch {
    throw new Error(
      "Statement import needs a fresh Expo Go reload or a rebuilt development app."
    );
  }
}

async function readPdfSource(file: Pick<PickedFile, "arrayBuffer" | "text">) {
  if (typeof file.arrayBuffer === "function") {
    return decodeBytesPreservingByteValues(new Uint8Array(await file.arrayBuffer()));
  }

  return file.text();
}

async function decodeBytesPreservingByteValues(bytes: Uint8Array) {
  const chunkSize = 8192;
  const yieldEveryChunks = 8;
  let output = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    output += String.fromCharCode(
      ...bytes.subarray(index, index + chunkSize)
    );

    const chunkIndex = index / chunkSize;

    if (chunkIndex > 0 && chunkIndex % yieldEveryChunks === 0) {
      await waitForNextImportChunk();
    }
  }

  return output;
}

async function waitForNextImportChunk() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
