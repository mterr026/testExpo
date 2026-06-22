import { describe, expect, it } from "vitest";

import { createLocalId } from "./idFactory";

describe("createLocalId", () => {
  it("creates_local_prefixed_ids_without_crypto_dependency", () => {
    const first = createLocalId();
    const second = createLocalId();

    expect(first).toMatch(/^local-[a-z0-9]+-[a-z0-9]+$/);
    expect(second).toMatch(/^local-[a-z0-9]+-[a-z0-9]+$/);
    expect(first).not.toBe(second);
  });
});
