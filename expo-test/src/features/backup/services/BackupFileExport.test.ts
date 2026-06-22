import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BudgetFlowBackupExportPackage } from "./BackupService";
import { writeBackupPackageToDevice } from "./BackupFileExport";

const fileSystemMock = vi.hoisted(() => {
  const writeImpl = vi.fn();
  const createdFiles: {
    create: ReturnType<typeof vi.fn>;
    name: string;
    parent: unknown;
    uri: string;
    write: ReturnType<typeof vi.fn>;
  }[] = [];

  class MockFile {
    create = vi.fn();
    name: string;
    parent: unknown;
    uri: string;
    write = vi.fn((content: string) => writeImpl(content));

    constructor(parent: unknown, name: string) {
      this.parent = parent;
      this.name = name;
      this.uri = `file:///documents/${name}`;
      createdFiles.push(this);
    }
  }

  return {
    createdFiles,
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
  File: fileSystemMock.File,
  Paths: fileSystemMock.Paths,
}));
vi.mock("react-native/Libraries/Share/Share", () => ({
  default: shareMock,
  Share: shareMock,
}));

function createExportPackage(): BudgetFlowBackupExportPackage {
  return {
    fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
    jsonText: "{\n  \"schemaVersion\": 1\n}",
    payload: {
      schemaVersion: 1,
      exportedAt: "2026-06-19T12:00:00.000Z",
      profile: null as never,
      records: {
        balanceAdjustments: [],
        billCycleInstances: [],
        bills: [],
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
    fileSystemMock.createdFiles.length = 0;
    fileSystemMock.writeImpl.mockReset();
    shareMock.share.mockReset();
    shareMock.share.mockResolvedValue({ action: shareMock.sharedAction });
  });

  it("writes_backup_json_and_opens_the_native_share_sheet", async () => {
    const exportPackage = createExportPackage();

    await expect(writeBackupPackageToDevice(exportPackage)).resolves.toEqual({
      fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
      recordCount: 0,
      shared: true,
      uri: "file:///documents/budget-flow-backup-2026-06-19-120000000Z.json",
    });

    expect(fileSystemMock.createdFiles).toHaveLength(1);
    expect(fileSystemMock.createdFiles[0]).toMatchObject({
      name: "budget-flow-backup-2026-06-19-120000000Z.json",
      parent: "document-directory",
    });
    expect(fileSystemMock.createdFiles[0].create).toHaveBeenCalledWith({
      overwrite: true,
    });
    expect(fileSystemMock.createdFiles[0].write).toHaveBeenCalledWith(
      "{\n  \"schemaVersion\": 1\n}"
    );
    expect(shareMock.share).toHaveBeenCalledWith(
      {
        title: "budget-flow-backup-2026-06-19-120000000Z.json",
        url: "file:///documents/budget-flow-backup-2026-06-19-120000000Z.json",
        message: "file:///documents/budget-flow-backup-2026-06-19-120000000Z.json",
      },
      {
        dialogTitle: "Save Budget Flow backup",
        subject: "budget-flow-backup-2026-06-19-120000000Z.json",
      }
    );
  });

  it("returns_the_written_file_when_the_share_sheet_is_dismissed", async () => {
    shareMock.share.mockResolvedValueOnce({
      action: shareMock.dismissedAction,
    });

    await expect(writeBackupPackageToDevice(createExportPackage())).resolves.toEqual({
      fileName: "budget-flow-backup-2026-06-19-120000000Z.json",
      recordCount: 0,
      shared: false,
      uri: "file:///documents/budget-flow-backup-2026-06-19-120000000Z.json",
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
