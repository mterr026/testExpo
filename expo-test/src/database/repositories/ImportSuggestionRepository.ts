import {
  mapImportSuggestionRow,
  type ImportSuggestionRow,
} from "./rowMappers";
import type {
  Clock,
  IdFactory,
  ImportSuggestion,
  NewImportSuggestion,
  TransactionalDatabaseExecutor,
} from "./types";

export class ImportSuggestionRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findById(id: string): Promise<ImportSuggestion | null> {
    const row = await this.db.getFirstAsync<ImportSuggestionRow>(
      `${suggestionSelectSql()} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? mapImportSuggestionRow(row) : null;
  }

  async findBySession(importSessionId: string): Promise<ImportSuggestion[]> {
    const rows = await this.db.getAllAsync<ImportSuggestionRow>(
      `${suggestionSelectSql()}
      WHERE import_session_id = ? AND deleted_at IS NULL
      ORDER BY status ASC, suggested_name ASC, created_at ASC`,
      [importSessionId]
    );

    return rows.map(mapImportSuggestionRow);
  }

  async findPendingByProfile(profileId: string): Promise<ImportSuggestion[]> {
    const rows = await this.db.getAllAsync<ImportSuggestionRow>(
      `${suggestionSelectSql()}
      WHERE profile_id = ?
        AND status = 'pending'
        AND deleted_at IS NULL
      ORDER BY created_at ASC`,
      [profileId]
    );

    return rows.map(mapImportSuggestionRow);
  }

  async rejectPendingByProfile(profileId: string): Promise<void> {
    const resolvedAt = this.now().toISOString();

    await this.db.runAsync(
      `UPDATE import_suggestions
      SET status = 'rejected',
        confirmed_bill_id = NULL,
        resolved_at = ?
      WHERE profile_id = ?
        AND status = 'pending'
        AND deleted_at IS NULL`,
      [resolvedAt, profileId]
    );
  }

  async create(input: NewImportSuggestion): Promise<ImportSuggestion> {
    validateSuggestionInput(input);

    const createdAt = this.now().toISOString();
    const suggestion: ImportSuggestion = {
      id: this.idFactory(),
      profileId: input.profileId,
      suggestedName: input.suggestedName.trim(),
      suggestedAmountCents: input.suggestedAmountCents,
      suggestionKind: input.suggestionKind ?? "bill",
      suggestedDate: input.suggestedDate ?? null,
      detectedInterval: input.detectedInterval,
      occurrenceCount: input.occurrenceCount,
      importSessionId: input.importSessionId,
      status: "pending",
      confirmedBillId: null,
      createdAt,
      resolvedAt: null,
      deletedAt: null,
    };

    await this.db.runAsync(
      `INSERT INTO import_suggestions (
        id,
        profile_id,
        suggested_name,
        suggested_amount_cents,
        suggestion_kind,
        suggested_date,
        detected_interval,
        occurrence_count,
        import_session_id,
        status,
        confirmed_bill_id,
        created_at,
        resolved_at,
        deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      suggestionToParams(suggestion)
    );

    return suggestion;
  }

  async confirm(id: string, confirmedBillId: string): Promise<ImportSuggestion> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Import suggestion ${id} not found.`);
    }

    if (!confirmedBillId.trim()) {
      throw new Error("Confirmed import suggestion requires a bill id.");
    }

    return this.resolve(current, "confirmed", confirmedBillId);
  }

  async confirmIncome(id: string): Promise<ImportSuggestion> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Import suggestion ${id} not found.`);
    }

    return this.resolve(current, "confirmed", null);
  }

  async reject(id: string): Promise<ImportSuggestion> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Import suggestion ${id} not found.`);
    }

    return this.resolve(current, "rejected", null);
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Import suggestion ${id} not found.`);
    }

    const deletedAt = this.now().toISOString();

    await this.db.runAsync(
      `UPDATE import_suggestions
      SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
      [deletedAt, id]
    );
  }

  private async resolve(
    current: ImportSuggestion,
    status: "confirmed" | "rejected",
    confirmedBillId: string | null
  ) {
    const resolvedAt = this.now().toISOString();
    const resolved: ImportSuggestion = {
      ...current,
      status,
      confirmedBillId,
      resolvedAt,
    };

    await this.db.runAsync(
      `UPDATE import_suggestions
      SET status = ?,
        confirmed_bill_id = ?,
        resolved_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
      [resolved.status, resolved.confirmedBillId, resolved.resolvedAt, resolved.id]
    );

    return resolved;
  }
}

function suggestionSelectSql() {
  return `SELECT
    id,
    profile_id,
    suggested_name,
    suggested_amount_cents,
    suggestion_kind,
    suggested_date,
    detected_interval,
    occurrence_count,
    import_session_id,
    status,
    confirmed_bill_id,
    created_at,
    resolved_at,
    deleted_at
    FROM import_suggestions`;
}

function suggestionToParams(suggestion: ImportSuggestion) {
  return [
    suggestion.id,
    suggestion.profileId,
    suggestion.suggestedName,
    suggestion.suggestedAmountCents,
    suggestion.suggestionKind,
    suggestion.suggestedDate,
    suggestion.detectedInterval,
    suggestion.occurrenceCount,
    suggestion.importSessionId,
    suggestion.status,
    suggestion.confirmedBillId,
    suggestion.createdAt,
    suggestion.resolvedAt,
    suggestion.deletedAt,
  ];
}

function validateSuggestionInput(input: NewImportSuggestion) {
  if (!input.profileId.trim()) {
    throw new Error("Import suggestion requires a profileId.");
  }

  if (!input.suggestedName.trim()) {
    throw new Error("Import suggestion requires a suggestedName.");
  }

  if (
    !Number.isInteger(input.suggestedAmountCents) ||
    input.suggestedAmountCents <= 0
  ) {
    throw new Error("Import suggestion amount must be greater than zero.");
  }

  if (!Number.isInteger(input.occurrenceCount) || input.occurrenceCount <= 0) {
    throw new Error("Import suggestion occurrenceCount must be greater than zero.");
  }

  if (!input.importSessionId.trim()) {
    throw new Error("Import suggestion requires an importSessionId.");
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No import suggestion idFactory was provided.");
}
