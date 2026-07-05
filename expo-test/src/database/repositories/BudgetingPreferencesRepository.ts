import {
  mapBudgetingPreferencesRow,
  type BudgetingPreferencesRow,
} from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  BudgetingPreferences,
  BudgetingPreferencesChanges,
  Clock,
  IdFactory,
  NewBudgetingPreferences,
  TransactionalDatabaseExecutor,
} from "./types";

export class BudgetingPreferencesRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findByProfileId(profileId: string): Promise<BudgetingPreferences | null> {
    const row = await this.db.getFirstAsync<BudgetingPreferencesRow>(
      `${preferencesSelectSql()} WHERE profile_id = ?`,
      [profileId]
    );

    return row ? mapBudgetingPreferencesRow(row) : null;
  }

  async create(input: NewBudgetingPreferences): Promise<BudgetingPreferences> {
    validatePreferencesInput(input);

    const createdAt = this.now().toISOString();
    const preferences: BudgetingPreferences = {
      id: this.idFactory(),
      profileId: input.profileId,
      envelopesEnabled: input.envelopesEnabled ?? false,
      createdAt,
      updatedAt: createdAt,
      syncStatus: "local",
    };

    validatePreferencesInput(preferences);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO budgeting_preferences (
          id,
          profile_id,
          envelopes_enabled,
          created_at,
          updated_at,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        preferencesToParams(preferences)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: preferences.profileId,
        entityType: "budgeting_preferences",
        entityId: preferences.id,
        operation: "create",
        payload: preferences,
      });
    });

    return preferences;
  }

  async update(
    profileId: string,
    changes: BudgetingPreferencesChanges
  ): Promise<BudgetingPreferences> {
    const current = await this.findByProfileId(profileId);

    if (!current) {
      throw new Error(`Budgeting preferences for profile ${profileId} not found.`);
    }

    const updated: BudgetingPreferences = {
      ...current,
      ...changes,
      updatedAt: this.now().toISOString(),
    };

    validatePreferencesInput(updated);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE budgeting_preferences
        SET envelopes_enabled = ?,
          updated_at = ?
        WHERE profile_id = ?`,
        [
          updated.envelopesEnabled ? 1 : 0,
          updated.updatedAt,
          updated.profileId,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: updated.profileId,
        entityType: "budgeting_preferences",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }
}

function preferencesSelectSql() {
  return `SELECT
    id,
    profile_id,
    envelopes_enabled,
    created_at,
    updated_at,
    sync_status
    FROM budgeting_preferences`;
}

function preferencesToParams(preferences: BudgetingPreferences) {
  return [
    preferences.id,
    preferences.profileId,
    preferences.envelopesEnabled ? 1 : 0,
    preferences.createdAt,
    preferences.updatedAt,
    preferences.syncStatus,
  ];
}

type PreferencesInputShape = Pick<BudgetingPreferences, "profileId">;

function validatePreferencesInput(input: PreferencesInputShape) {
  if (!input.profileId.trim()) {
    throw new Error("Budgeting preferences require a profileId.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No budgeting preferences idFactory was provided.");
}
