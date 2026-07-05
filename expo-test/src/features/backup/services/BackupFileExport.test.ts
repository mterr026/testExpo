import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BudgetFlowBackupExportPackage } from "./BackupService";
import { BUDGET_FLOW_BACKUP_FOLDER_NAME } from "./backupPaths";
import { writeBackupPackageToDevice } from "./BackupFileExport";

const fileSystemMock = vi.hoisted(() => {
  const writeImpl = vi.fn();
  const createdDirectories: {
    create: ReturnType<typeof vi.fn>;
    exists: boolean;
    name: string;
    parent: unknown;
  }[] = [];
  const createdFiles: {
    create: ReturnType<typeof vi.fn>;
    name: string;
    parent: unknown;
    uri: string;
    write: ReturnType<typeof vi.fn>;
  }[] = [];

  class MockDirectory {
    create = vi.fn(() => {
      this.exists = true;
    });
    exists = false;
    name: string;
    parent: unknown;

    constructor(parent: unknown, name: string) {
      this.parent = parent;
      this.name = name;
      createdDirectories.push(this);
    }
  }

  class MockFile {
    create = vi.fn();
    name: string;
    parent: unknown;
    uri: string;
    write = vi.fn((content: string) => writeImpl(content));

    constructor(parent: unknown, name: string) {
      this.parent = parent;
      this.name = name;
      this.uri = `file:///documents/${BUDGET_FLOW_BACKUP_FOLDER_NAME}/${name}`;
      createdFiles.push(this);
    }
  }

  return {
    createdDirectories,
    createdFiles,
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: "document-directory" },
    writeImpl,
  };
});
const shareMock = vi.hoisted(() => ({
  dismissedAction: "dismissedAction",
  share: vi.fn(),
  sharedAction: "sharedAction",
}));

vi.mock("expo-file-system", () => ({
  Directory: fileSystemMock.Directory,
  File: fileSystemMock.File,
  Paths: fileSystemMock.Paths,
}));
vi.mock("react-native/Libraries/Share/Share", () => ({
  default: shareMock,
  Share: shareMock,
}));

function createExportPackage(): BudgetFlowBackupExportPackage {
  return {
    fileName: "Budget Flow Backup 2026-06-19 1200.json",
    jsonText: "{\n  \"schemaVersion\": 2\n}",
    payload: {
      schemaVersion: 2,
      exportedAt: "2026-06-19T12:00:00.000Z",
      profile: null as never,
      records: {
        balanceAdjustments: [],
        billCycleInstances: [],
        bills: [],
        budgetingPreferences: null,
        envelopes: [],
        notificationSettings: null,
        paychecks: [],
        purchases: [],
      },
      recordCount: 0,
    },
    recordCount: 0,
  };
}

describe("writeBackupPackageToDevice", () => {
  beforeEach(() => {
    fileSystemMock.createdDirectories.length = 0;
    fileSystemMock.createdFiles.length = 0;
    fileSystemMock.writeImpl.mockReset();
    shareMock.share.mockReset();
    shareMock.share.mockResolvedValue({ action: shareMock.sharedAction });
  });

  it("writes_backup_json_to_the_budget_flow_backups_folder_and_opens_share_sheet", async () => {
    const exportPackage = createExportPackage();

    await expect(writeBackupPackageToDevice(exportPackage)).resolves.toEqual({
      fileName: "Budget Flow Backup 2026-06-19 1200.json",
      recordCount: 0,
      shared: true,
      uri: "file:///documents/Budget Flow Backups/Budget Flow Backup 2026-06-19 1200.json",
    });

    expect(fileSystemMock.createdDirectories).toHaveLength(1);
    expect(fileSystemMock.createdDirectories[0]).toMatchObject({
      name: BUDGET_FLOW_BACKUP_FOLDER_NAME,
      parent: "document-directory",
    });
    expect(fileSystemMock.createdDirectories[0].create).toHaveBeenCalledWith({
      intermediates: true,
      idempotent: true,
    });
    expect(fileSystemMock.createdFiles).toHaveLength(1);
    expect(fileSystemMock.createdFiles[0]).toMatchObject({
      name: "Budget Flow Backup 2026-06-19 1200.json",
      parent: fileSystemMock.createdDirectories[0],
    });
    expect(fileSystemMock.createdFiles[0].create).toHaveBeenCalledWith({
      overwrite: true,
    });
    expect(fileSystemMock.createdFiles[0].write).toHaveBeenCalledWith(
      "{\n  \"schemaVersion\": 2\n}"
    );
    expect(shareMock.share).toHaveBeenCalledWith(
      {
        title: "Budget Flow Backup 2026-06-19 1200.json",
        url: "file:///documents/Budget Flow Backups/Budget Flow Backup 2026-06-19 1200.json",
        message:
          "file:///documents/Budget Flow Backups/Budget Flow Backup 2026-06-19 1200.json",
      },
      {
        dialogTitle: "Save Budget Flow backup",
        subject: "Budget Flow Backup 2026-06-19 1200.json",
      }
    );
  });

  it("returns_the_written_file_when_the_share_sheet_is_dismissed", async () => {
    shareMock.share.mockResolvedValueOnce({
      action: shareMock.dismissedAction,
    });

    await expect(writeBackupPackageToDevice(createExportPackage())).resolves.toEqual({
      fileName: "Budget Flow Backup 2026-06-19 1200.json",
      recordCount: 0,
      shared: false,
      uri: "file:///documents/Budget Flow Backups/Budget Flow Backup 2026-06-19 1200.json",
    });
  });

  it("surfaces_file_write_failures", async () => {
    fileSystemMock.writeImpl.mockImplementationOnce(() => {
      throw new Error("Disk full");
    });

    await expect(writeBackupPackageToDevice(createExportPackage())).rejects.toThrow(
      "Disk full"
    );
  });
});
