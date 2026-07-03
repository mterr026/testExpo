import { mapProfileRow, type ProfileRow } from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  Clock,
  IdFactory,
  NewProfile,
  Profile,
  ProfileChanges,
  TransactionalDatabaseExecutor,
} from "./types";

export class ProfileRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<Profile | null> {
    const row = await this.db.getFirstAsync<ProfileRow>(
      `${profileSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapProfileRow(row) : null;
  }

  async findActive(): Promise<Profile | null> {
    const row = await this.db.getFirstAsync<ProfileRow>(
      `${profileSelectSql()} WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`
    );

    return row ? mapProfileRow(row) : null;
  }

  async create(input: NewProfile = {}): Promise<Profile> {
    const createdAt = this.now().toISOString();
    const profile: Profile = {
      id: this.idFactory(),
      displayName: input.displayName ?? null,
      essentialReserveCents: input.essentialReserveCents ?? 0,
      currencyCode: input.currencyCode ?? "USD",
      onboardingComplete: input.onboardingComplete ?? false,
      openingBalanceCents: input.openingBalanceCents ?? 0,
      tutorialComplete: input.tutorialComplete ?? false,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      syncStatus: "local",
    };

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO profiles (
          id,
          display_name,
          essential_reserve,
          currency_code,
          onboarding_complete,
          opening_balance_cents,
          tutorial_complete,
          created_at,
          updated_at,
          deleted_at,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        profileToParams(profile)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: profile.id,
        entityType: "profile",
        entityId: profile.id,
        operation: "create",
        payload: profile,
      });
    });

    return profile;
  }

  async update(id: string, changes: ProfileChanges): Promise<Profile> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Profile ${id} not found.`);
    }

    const updated: Profile = {
      ...current,
      ...changes,
      updatedAt: this.now().toISOString(),
    };

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE profiles
        SET display_name = ?,
          essential_reserve = ?,
          currency_code = ?,
          onboarding_complete = ?,
          opening_balance_cents = ?,
          tutorial_complete = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [
          updated.displayName,
          updated.essentialReserveCents,
          updated.currencyCode,
          updated.onboardingComplete ? 1 : 0,
          updated.openingBalanceCents,
          updated.tutorialComplete ? 1 : 0,
          updated.updatedAt,
          updated.id,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: updated.id,
        entityType: "profile",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Profile ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE profiles
        SET deleted_at = ?,
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
        [deletedAt, deletedAt, id]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: id,
        entityType: "profile",
        entityId: id,
        operation: "delete",
        payload: {
          entityId: id,
          deletedAt,
        },
      });
    });
  }
}

function profileSelectSql() {
  return `SELECT
    id,
    display_name,
    essential_reserve,
    currency_code,
    onboarding_complete,
    opening_balance_cents,
    tutorial_complete,
    created_at,
    updated_at,
    deleted_at,
    sync_status
    FROM profiles`;
}

function profileToParams(profile: Profile) {
  return [
    profile.id,
    profile.displayName,
    profile.essentialReserveCents,
    profile.currencyCode,
    profile.onboardingComplete ? 1 : 0,
    profile.openingBalanceCents,
    profile.tutorialComplete ? 1 : 0,
    profile.createdAt,
    profile.updatedAt,
    profile.deletedAt,
    profile.syncStatus,
  ];
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No profile idFactory was provided.");
}
