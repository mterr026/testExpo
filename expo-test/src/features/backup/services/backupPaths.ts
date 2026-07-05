export const BUDGET_FLOW_BACKUP_FOLDER_NAME = "Budget Flow Backups";

export function createBackupFileName(exportedAt: string) {
  const date = new Date(exportedAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `Budget Flow Backup ${year}-${month}-${day} ${hours}${minutes}.json`;
}
