export type DemoPreviewState = "pending" | "story" | "exploring" | "done";

const DEMO_PREVIEW_FILE_NAME = "demo-preview-state.json";

type StoredDemoPreviewState = {
  profileId: string;
  state: DemoPreviewState;
};

export async function loadDemoPreviewState(
  profileId: string
): Promise<DemoPreviewState> {
  try {
    const { File, Paths } = await loadDemoPreviewFileSystem();
    const file = new File(Paths.document, DEMO_PREVIEW_FILE_NAME);

    if (!file.exists) {
      return "pending";
    }

    const stored = JSON.parse(await file.text()) as Partial<{
      profileId: string;
      state: string;
    }>;

    if (stored.profileId !== profileId) {
      return "pending";
    }

    return normalizeDemoPreviewState(stored.state);
  } catch {
    return "pending";
  }
}

export async function saveDemoPreviewState(
  profileId: string,
  state: DemoPreviewState
): Promise<void> {
  const { File, Paths } = await loadDemoPreviewFileSystem();
  const file = new File(Paths.document, DEMO_PREVIEW_FILE_NAME);
  const payload: StoredDemoPreviewState = { profileId, state };

  file.create({ overwrite: true });
  file.write(JSON.stringify(payload));
}

function normalizeDemoPreviewState(value: unknown): DemoPreviewState {
  if (value === "pending" || value === "story" || value === "exploring" || value === "done") {
    return value;
  }

  // Older spotlight-tour builds used "touring".
  if (value === "touring") {
    return "exploring";
  }

  return "pending";
}

async function loadDemoPreviewFileSystem(): Promise<{
  File: typeof import("expo-file-system").File;
  Paths: typeof import("expo-file-system").Paths;
}> {
  const FileSystem = await import("expo-file-system");

  return {
    File: FileSystem.File,
    Paths: FileSystem.Paths,
  };
}
