import type * as FileSystemModule from "expo-file-system";

export const STATEMENT_FILE_PICKER_OPTIONS = {
  mimeTypes: "*/*" as const,
  multipleFiles: false as const,
};

type PickedFile = Pick<
  FileSystemModule.File,
  "arrayBuffer" | "delete" | "name" | "text" | "uri"
> & {
  mimeType?: string | null;
};

export async function resolveStatementFileKind(
  file: PickedFile
): Promise<"csv" | "pdf" | "unknown"> {
  if (isPdfFile(file)) {
    return "pdf";
  }

  if (isCsvFile(file)) {
    return "csv";
  }

  const header = await readFileHeader(file);

  if (header.startsWith("%PDF")) {
    return "pdf";
  }

  if (looksLikeCsvText(header, file.name)) {
    return "csv";
  }

  return "unknown";
}

export function isPdfFile(file: Pick<PickedFile, "mimeType" | "name">) {
  const name = file.name.toLowerCase();
  const mimeType = file.mimeType?.toLowerCase() ?? "";

  return (
    name.endsWith(".pdf") ||
    mimeType === "application/pdf" ||
    mimeType.endsWith("/pdf")
  );
}

export function isCsvFile(file: Pick<PickedFile, "mimeType" | "name">) {
  const name = file.name.toLowerCase();
  const mimeType = file.mimeType?.toLowerCase() ?? "";

  return (
    name.endsWith(".csv") ||
    mimeType === "text/csv" ||
    mimeType === "text/comma-separated-values" ||
    mimeType === "application/csv" ||
    mimeType.endsWith("/csv")
  );
}

async function readFileHeader(file: Pick<PickedFile, "arrayBuffer" | "text">) {
  if (typeof file.arrayBuffer === "function") {
    const bytes = new Uint8Array(await file.arrayBuffer());

    return decodeBytesPreservingByteValues(bytes.subarray(0, Math.min(bytes.length, 4096)));
  }

  const text = await file.text();

  return text.slice(0, 4096);
}

function looksLikeCsvText(header: string, fileName: string) {
  if (!fileName.toLowerCase().endsWith(".csv")) {
    return false;
  }

  const sample = header.trim();

  return sample.includes(",") && /\d/.test(sample);
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
