import type { ImportSuggestion } from "@/database/repositories/types";

const secondaryIncomePatterns = [
  "pension",
  "disability",
  "social security",
  "ssa",
  "ssi",
  "retirement",
  "benefit",
  "unemployment",
  "va ",
];

export function inferDefaultIncomeIsPrimary(suggestion: ImportSuggestion) {
  const name = suggestion.suggestedName.toLowerCase();

  return !secondaryIncomePatterns.some((pattern) => name.includes(pattern));
}
