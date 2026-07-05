import type * as FileSystemModule from "expo-file-system";

export type PickedBackupFile = {
  fileName: string;
  jsonText: string;
};

const BACKUP_FILE_PICKER_OPTIONS = {
  mimeTypes: "application/json" as const,
  multipleFiles: false as const,
};

type PickedFile = Pick<FileSystemModule.File, "delete" | "name" | "text">;

export async function pickAndReadBackupFile(): Promise<PickedBackupFile | null> {
  const { File } = await loadBackupFileSystem();
  const result = await File.pickFileAsync(BACKUP_FILE_PICKER_OPTIONS);

  if (result.canceled) {
    return null;
  }

  const file = result.result as PickedFile;

  try {
    return {
      fileName: file.name,
      jsonText: await file.text(),
    };
  } finally {
    file.delete();
  }
}

async function loadBackupFileSystem(): Promise<{
  File: typeof FileSystemModule.File;
}> {
  try {
    const FileSystem = await import("expo-file-system");

    return {
      File: FileSystem.File,
    };
  } catch {
    throw new Error(
      "Backup import needs a fresh Expo Go reload or a rebuilt development app."
    );
  }
}
