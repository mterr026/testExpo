import { describe, expect, it } from "vitest";

import { ImportSuggestionRepository } from "./ImportSuggestionRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const suggestionRow = {
  id: "suggestion-1",
  profile_id: "profile-1",
  suggested_name: "Internet",
  suggested_amount_cents: 7500,
  suggestion_kind: "bill",
  suggested_date: "2026-06-15",
  detected_interval: "monthly",
  occurrence_count: 3,
  import_session_id: "session-1",
  status: "pending",
  confirmed_bill_id: null,
  created_at: "2026-06-01T12:00:00.000Z",
  resolved_at: null,
  deleted_at: null,
} as const;

describe("ImportSuggestionRepository", () => {
  it("findById_maps_active_suggestion_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(suggestionRow);
    const repo = new ImportSuggestionRepository(db);

    await expect(repo.findById("suggestion-1")).resolves.toEqual({
      id: "suggestion-1",
      profileId: "profile-1",
      suggestedName: "Internet",
      suggestedAmountCents: 7500,
      suggestionKind: "bill",
      suggestedDate: "2026-06-15",
      detectedInterval: "monthly",
      occurrenceCount: 3,
      importSessionId: "session-1",
      status: "pending",
      confirmedBillId: null,
      createdAt: "2026-06-01T12:00:00.000Z",
      resolvedAt: null,
      deletedAt: null,
    });
    expect(db.getFirstCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.getFirstCalls[0].params).toEqual(["suggestion-1"]);
  });

  it("findBySession_returns_suggestions_ordered_for_review", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      suggestionRow,
      { ...suggestionRow, id: "suggestion-2", suggested_name: "Power" },
    ]);
    const repo = new ImportSuggestionRepository(db);

    const suggestions = await repo.findBySession("session-1");

    expect(suggestions.map((suggestion) => suggestion.id)).toEqual([
      "suggestion-1",
      "suggestion-2",
    ]);
    expect(db.getAllCalls[0].source).toContain(
      "ORDER BY status ASC, suggested_name ASC, created_at ASC"
    );
    expect(db.getAllCalls[0].params).toEqual(["session-1"]);
  });

  it("findPendingByProfile_returns_pending_suggestions", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([suggestionRow]);
    const repo = new ImportSuggestionRepository(db);

    await expect(repo.findPendingByProfile("profile-1")).resolves.toHaveLength(1);
    expect(db.getAllCalls[0].source).toContain("status = 'pending'");
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });

  it("rejectPendingByProfile_marks_only_pending_profile_suggestions_rejected", async () => {
    const db = new FakeDatabase();
    const repo = new ImportSuggestionRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.rejectPendingByProfile("profile-1");

    expect(db.runCalls).toHaveLength(1);
    expect(db.runCalls[0].source).toContain("status = 'rejected'");
    expect(db.runCalls[0].source).toContain("status = 'pending'");
    expect(db.runCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "profile-1",
    ]);
  });

  it("create_inserts_local_only_suggestion_without_sync_queue", async () => {
    const db = new FakeDatabase();
    const repo = new ImportSuggestionRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const suggestion = await repo.create({
      profileId: "profile-1",
      suggestedName: " Internet ",
      suggestedAmountCents: 7500,
      detectedInterval: "monthly",
      occurrenceCount: 3,
      importSessionId: "session-1",
    });

    expect(suggestion).toEqual({
      id: "id-1",
      profileId: "profile-1",
      suggestedName: "Internet",
      suggestedAmountCents: 7500,
      suggestionKind: "bill",
      suggestedDate: null,
      detectedInterval: "monthly",
      occurrenceCount: 3,
      importSessionId: "session-1",
      status: "pending",
      confirmedBillId: null,
      createdAt: "2026-06-01T12:00:00.000Z",
      resolvedAt: null,
      deletedAt: null,
    });
    expect(db.runCalls).toHaveLength(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO import_suggestions");
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "profile-1",
      "Internet",
      7500,
      "bill",
      null,
      "monthly",
      3,
      "session-1",
      "pending",
      null,
      "2026-06-01T12:00:00.000Z",
      null,
      null,
    ]);
  });

  it("confirm_marks_suggestion_resolved_with_bill_id", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(suggestionRow);
    const repo = new ImportSuggestionRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const confirmed = await repo.confirm("suggestion-1", "bill-1");

    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.confirmedBillId).toBe("bill-1");
    expect(confirmed.resolvedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(db.runCalls[0].params).toEqual([
      "confirmed",
      "bill-1",
      "2026-06-01T12:00:00.000Z",
      "suggestion-1",
    ]);
  });

  it("confirmIncome_marks_suggestion_resolved_without_bill_id", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push({
      ...suggestionRow,
      suggestion_kind: "income",
      suggested_name: "USPS Paycheck",
    });
    const repo = new ImportSuggestionRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const confirmed = await repo.confirmIncome("suggestion-1");

    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.confirmedBillId).toBeNull();
    expect(confirmed.resolvedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(db.runCalls[0].params).toEqual([
      "confirmed",
      null,
      "2026-06-01T12:00:00.000Z",
      "suggestion-1",
    ]);
  });

  it("reject_marks_suggestion_resolved_without_bill_id", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(suggestionRow);
    const repo = new ImportSuggestionRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const rejected = await repo.reject("suggestion-1");

    expect(rejected.status).toBe("rejected");
    expect(rejected.confirmedBillId).toBeNull();
    expect(rejected.resolvedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(db.runCalls[0].params?.[0]).toBe("rejected");
  });

  it("softDelete_sets_deleted_at_without_sync_queue", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(suggestionRow);
    const repo = new ImportSuggestionRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.softDelete("suggestion-1");

    expect(db.runCalls).toHaveLength(1);
    expect(db.runCalls[0].source).toContain("SET deleted_at = ?");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "suggestion-1",
    ]);
  });

  it("rejects_invalid_suggestion_inputs", async () => {
    const repo = new ImportSuggestionRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "",
        suggestedName: "Internet",
        suggestedAmountCents: 1,
        suggestionKind: "bill",
        detectedInterval: "monthly",
        occurrenceCount: 1,
        importSessionId: "session-1",
      })
    ).rejects.toThrow("Import suggestion requires a profileId.");
    await expect(
      repo.create({
        profileId: "profile-1",
        suggestedName: "",
        suggestedAmountCents: 1,
        suggestionKind: "bill",
        detectedInterval: "monthly",
        occurrenceCount: 1,
        importSessionId: "session-1",
      })
    ).rejects.toThrow("Import suggestion requires a suggestedName.");
    await expect(
      repo.create({
        profileId: "profile-1",
        suggestedName: "Internet",
        suggestedAmountCents: 0,
        suggestionKind: "bill",
        detectedInterval: "monthly",
        occurrenceCount: 1,
        importSessionId: "session-1",
      })
    ).rejects.toThrow("Import suggestion amount must be greater than zero.");
    await expect(
      repo.create({
        profileId: "profile-1",
        suggestedName: "Internet",
        suggestedAmountCents: 1,
        suggestionKind: "bill",
        detectedInterval: "monthly",
        occurrenceCount: 0,
        importSessionId: "session-1",
      })
    ).rejects.toThrow(
      "Import suggestion occurrenceCount must be greater than zero."
    );
  });

  it("resolve_and_soft_delete_reject_missing_suggestion", async () => {
    const repo = new ImportSuggestionRepository(new FakeDatabase());

    await expect(repo.confirm("missing", "bill-1")).rejects.toThrow(
      "Import suggestion missing not found."
    );
    await expect(repo.reject("missing")).rejects.toThrow(
      "Import suggestion missing not found."
    );
    await expect(repo.softDelete("missing")).rejects.toThrow(
      "Import suggestion missing not found."
    );
  });
});
