import type {
  ActivityLogEntityType,
  ActivityLogEventType,
  CreateActivityLogEntryInput,
} from "./types";

export const activityLogEventTypes = [
  "purchase_added",
  "purchase_updated",
  "purchase_deleted",
  "purchase_state_changed",
  "paycheck_confirmed",
  "paycheck_adjusted",
  "paycheck_added",
  "paycheck_deleted",
  "bill_added",
  "bill_updated",
  "bill_paused",
  "bill_resumed",
  "bill_deleted",
  "bill_paid",
  "variable_bill_confirmed",
  "balance_adjusted",
  "reserve_updated",
  "import_completed",
  "backup_exported",
  "backup_restored",
] as const satisfies readonly ActivityLogEventType[];

export const activityLogEntityTypes = [
  "purchase",
  "paycheck",
  "bill",
  "bill_instance",
  "balance",
  "import",
  "backup",
] as const satisfies readonly ActivityLogEntityType[];

const expectedEntityByEvent: Record<ActivityLogEventType, ActivityLogEntityType> = {
  purchase_added: "purchase",
  purchase_updated: "purchase",
  purchase_deleted: "purchase",
  purchase_state_changed: "purchase",
  paycheck_confirmed: "paycheck",
  paycheck_adjusted: "paycheck",
  paycheck_added: "paycheck",
  paycheck_deleted: "paycheck",
  bill_added: "bill",
  bill_updated: "bill",
  bill_paused: "bill",
  bill_resumed: "bill",
  bill_deleted: "bill",
  bill_paid: "bill_instance",
  variable_bill_confirmed: "bill_instance",
  balance_adjusted: "balance",
  reserve_updated: "balance",
  import_completed: "import",
  backup_exported: "backup",
  backup_restored: "backup",
};

export function createActivityLogEntry({
  profileId,
  eventType,
  entityType,
  entityId = null,
  summary = null,
  idFactory = createDefaultId,
  now = () => new Date(),
}: CreateActivityLogEntryInput) {
  validateActivityLogInput({ profileId, eventType, entityType, entityId });

  return {
    id: idFactory(),
    profileId,
    eventType,
    entityType,
    entityId,
    summary: normalizeSummary(summary),
    createdAt: now().toISOString(),
  };
}

export function getExpectedActivityLogEntityType(
  eventType: ActivityLogEventType
) {
  return expectedEntityByEvent[eventType];
}

function validateActivityLogInput({
  profileId,
  eventType,
  entityType,
  entityId,
}: {
  profileId: string;
  eventType: ActivityLogEventType;
  entityType: ActivityLogEntityType;
  entityId: string | null;
}) {
  if (!profileId.trim()) {
    throw new Error("Activity log entry requires a profileId.");
  }

  const expectedEntityType = getExpectedActivityLogEntityType(eventType);

  if (entityType !== expectedEntityType) {
    throw new Error(
      `Activity event ${eventType} must use entity type ${expectedEntityType}.`
    );
  }

  if (requiresEntityId(entityType) && !entityId?.trim()) {
    throw new Error(`Activity entity ${entityType} requires an entityId.`);
  }
}

function requiresEntityId(entityType: ActivityLogEntityType) {
  return entityType !== "import" && entityType !== "backup";
}

function normalizeSummary(summary: string | null) {
  const normalized = summary?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No activity log idFactory was provided.");
}
