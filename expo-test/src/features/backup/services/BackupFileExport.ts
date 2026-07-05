import type * as FileSystemModule from "expo-file-system";

import type { BudgetFlowBackupExportPackage } from "./BackupService";
import { BUDGET_FLOW_BACKUP_FOLDER_NAME } from "./backupPaths";

type ShareModule = {
  dismissedAction: "dismissedAction";
  share: (
    content: {
      message?: string;
      title?: string;
      url?: string;
    },
    options?: {
      dialogTitle?: string;
      subject?: string;
    }
  ) => Promise<{
    action: string;
  }>;
  sharedAction: "sharedAction";
};

export type WrittenBackupFile = {
  fileName: string;
  recordCount: number;
  shared: boolean;
  uri: string;
};

export async function writeBackupPackageToDevice(
  exportPackage: BudgetFlowBackupExportPackage
): Promise<WrittenBackupFile> {
  const { Directory, File, Paths } = await loadBackupFileSystem();
  const backupDirectory = new Directory(Paths.document, BUDGET_FLOW_BACKUP_FOLDER_NAME);

  if (!backupDirectory.exists) {
    backupDirectory.create({ intermediates: true, idempotent: true });
  }

  const file = new File(backupDirectory, exportPackage.fileName);

  file.create({ overwrite: true });
  file.write(exportPackage.jsonText);
  const shared = await shareBackupFile(file.uri, exportPackage.fileName);

  return {
    fileName: exportPackage.fileName,
    recordCount: exportPackage.recordCount,
    shared,
    uri: file.uri,
  };
}

async function shareBackupFile(uri: string, fileName: string) {
  const Share = await loadReactNativeShare();
  const result = await Share.share(
    {
      title: fileName,
      url: uri,
      message: uri,
    },
    {
      dialogTitle: "Save Budget Flow backup",
      subject: fileName,
    }
  );

  return result.action === Share.sharedAction;
}

async function loadReactNativeShare(): Promise<ShareModule> {
  try {
    const ReactNativeShare = (await import(
      "react-native/Libraries/Share/Share"
    )) as unknown as {
      default?: ShareModule;
      Share?: ShareModule;
    } & Partial<ShareModule>;

    return (
      ReactNativeShare.default ??
      ReactNativeShare.Share ??
      (ReactNativeShare as ShareModule)
    );
  } catch {
    throw new Error("Backup sharing needs a fresh app reload.");
  }
}

async function loadBackupFileSystem(): Promise<{
  Directory: typeof FileSystemModule.Directory;
  File: typeof FileSystemModule.File;
  Paths: typeof FileSystemModule.Paths;
}> {
  try {
    const FileSystem = await import("expo-file-system");

    return {
      Directory: FileSystem.Directory,
      File: FileSystem.File,
      Paths: FileSystem.Paths,
    };
  } catch {
    throw new Error(
      "Backup export needs a fresh Expo Go reload or a rebuilt development app."
    );
  }
}
