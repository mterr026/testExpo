import { describe, expect, it } from "vitest";

import { getImportLoadingLabel } from "./importLoadingStatus";

describe("getImportLoadingLabel", () => {
  it("describes_each_import_phase", () => {
    expect(getImportLoadingLabel("preparing").title).toBe("Preparing import...");
    expect(getImportLoadingLabel("reading").title).toBe("Reading your statement...");
    expect(getImportLoadingLabel("analyzing").title).toBe("Analyzing transactions...");
  });
});
