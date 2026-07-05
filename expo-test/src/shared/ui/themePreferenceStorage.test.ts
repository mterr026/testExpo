import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFile = {
  exists: false,
  text: vi.fn(),
  create: vi.fn(),
  write: vi.fn(),
};

vi.mock("expo-file-system", () => ({
  File: vi.fn(function MockFile() {
    return mockFile;
  }),
  Paths: {
    document: "/mock/document",
  },
}));

import { loadThemePreference, saveThemePreference } from "./themePreferenceStorage";

describe("themePreferenceStorage", () => {
  beforeEach(() => {
    mockFile.exists = false;
    mockFile.text.mockReset();
    mockFile.create.mockReset();
    mockFile.write.mockReset();
  });

  it("returns_system_when_no_file_exists", async () => {
    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("loads_a_valid_stored_preference", async () => {
    mockFile.exists = true;
    mockFile.text.mockResolvedValue(JSON.stringify("dark"));

    await expect(loadThemePreference()).resolves.toBe("dark");
  });

  it("falls_back_to_system_for_invalid_stored_values", async () => {
    mockFile.exists = true;
    mockFile.text.mockResolvedValue(JSON.stringify("auto"));

    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("persists_the_selected_preference", async () => {
    await saveThemePreference("light");

    expect(mockFile.create).toHaveBeenCalledWith({ overwrite: true });
    expect(mockFile.write).toHaveBeenCalledWith(JSON.stringify("light"));
  });
});
