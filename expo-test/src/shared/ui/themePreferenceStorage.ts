import type * as FileSystemModule from "expo-file-system";

import {
  isThemePreference,
  type ThemePreference,
} from "./themePreference";

const THEME_PREFERENCE_FILE_NAME = "theme-preference.json";

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const { File, Paths } = await loadThemePreferenceFileSystem();
    const file = new File(Paths.document, THEME_PREFERENCE_FILE_NAME);

    if (!file.exists) {
      return "system";
    }

    const stored = JSON.parse(await file.text()) as unknown;

    if (isThemePreference(stored)) {
      return stored;
    }
  } catch {
    // Fall back to system when storage is unavailable.
  }

  return "system";
}

export async function saveThemePreference(
  preference: ThemePreference
): Promise<void> {
  const { File, Paths } = await loadThemePreferenceFileSystem();
  const file = new File(Paths.document, THEME_PREFERENCE_FILE_NAME);

  file.create({ overwrite: true });
  file.write(JSON.stringify(preference));
}

async function loadThemePreferenceFileSystem(): Promise<{
  File: typeof FileSystemModule.File;
  Paths: typeof FileSystemModule.Paths;
}> {
  const FileSystem = await import("expo-file-system");

  return {
    File: FileSystem.File,
    Paths: FileSystem.Paths,
  };
}
