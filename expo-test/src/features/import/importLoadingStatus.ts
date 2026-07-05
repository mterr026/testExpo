export type ImportPhase = "preparing" | "reading" | "analyzing";

export function getImportLoadingLabel(phase: ImportPhase) {
  switch (phase) {
    case "preparing":
      return {
        subtitle: "This only takes a moment.",
        title: "Preparing import...",
      };
    case "reading":
      return {
        subtitle: "CSV files load quickly. PDFs may take longer while text is extracted.",
        title: "Reading your statement...",
      };
    case "analyzing":
      return {
        subtitle: "Looking for recurring bills and paychecks.",
        title: "Analyzing transactions...",
      };
  }
}
