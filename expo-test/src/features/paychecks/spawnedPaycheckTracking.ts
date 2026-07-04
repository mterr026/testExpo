const SPAWNED_NEXT_PAYCHECK_PREFIX = "__budgetflow_spawned_next:";

export function readSpawnedNextPaycheckId(notes: string | null): string | null {
  if (!notes) {
    return null;
  }

  for (const line of notes.split("\n")) {
    if (line.startsWith(SPAWNED_NEXT_PAYCHECK_PREFIX)) {
      const spawnedPaycheckId = line.slice(SPAWNED_NEXT_PAYCHECK_PREFIX.length).trim();

      return spawnedPaycheckId || null;
    }
  }

  return null;
}

export function stripSpawnedNextPaycheckId(notes: string | null): string | null {
  if (!notes) {
    return null;
  }

  const userNotes = notes
    .split("\n")
    .filter((line) => !line.startsWith(SPAWNED_NEXT_PAYCHECK_PREFIX));

  return userNotes.length > 0 ? userNotes.join("\n") : null;
}

export function withSpawnedNextPaycheckId(
  notes: string | null,
  spawnedPaycheckId: string | null
): string | null {
  const userNotes = stripSpawnedNextPaycheckId(notes);

  if (!spawnedPaycheckId) {
    return userNotes;
  }

  const marker = `${SPAWNED_NEXT_PAYCHECK_PREFIX}${spawnedPaycheckId}`;

  return userNotes ? `${userNotes}\n${marker}` : marker;
}
