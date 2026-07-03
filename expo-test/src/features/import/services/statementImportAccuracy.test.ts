import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseCsvImportSuggestions } from "./CsvImportParser";
import { parseBankStatementImport } from "./BankStatementParser";

const fixturesDir = join(process.cwd(), "fixtures/statements");

function readFixture(name: string) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

const parseOptions = {
  includeSingleOccurrenceCandidates: true,
  parseAsStatementText: true,
} as const;

describe("statementImportAccuracy", () => {
  it("parses_generic_ocr_detached_amount_fixture_with_low_noise", () => {
    const statementText = readFixture("generic-ocr-detached-amount.txt");
    const result = parseBankStatementImport(statementText, parseOptions);
    const suggestions = parseCsvImportSuggestions(statementText, parseOptions);

    expect(result.transactions.length).toBeGreaterThanOrEqual(3);
    expect(
      result.transactions.find((transaction) =>
        transaction.description.includes("SUBSCRIPTION SERVICE")
      )
    ).toMatchObject({
      debitCents: 3054,
      type: "debit",
    });
    expect(
      result.transactions.find((transaction) =>
        transaction.description.includes("PAYROLL")
      )
    ).toMatchObject({
      creditCents: 280807,
      type: "credit",
    });
    expect(
      suggestions.some((suggestion) =>
        suggestion.suggestedName.includes("ATT") ||
        suggestion.suggestedName.includes("INTERNET")
      )
    ).toBe(true);
    expect(
      suggestions.some((suggestion) =>
        suggestion.suggestionKind === "income" &&
        suggestion.suggestedName.includes("PAYROLL")
      )
    ).toBe(true);
    expect(
      suggestions.some((suggestion) =>
        /ZELLE|OVERDRAFT|CRCARDPMT|SERVICE FEE/.test(suggestion.suggestedName)
      )
    ).toBe(false);
  });

  it("parses_generic_two_column_ocr_fragment_fixture", () => {
    const statementText = readFixture("generic-ocr-two-column-fragment.txt");
    const result = parseBankStatementImport(statementText, parseOptions);
    const suggestions = parseCsvImportSuggestions(statementText, parseOptions);

    expect(
      result.transactions.find((transaction) =>
        transaction.description.includes("SUBSCRIPTION SERVICE")
      )
    ).toMatchObject({
      debitCents: 3054,
      type: "debit",
    });
    expect(
      result.transactions.find((transaction) =>
        transaction.description.includes("ELEC PYMT")
      )
    ).toMatchObject({
      debitCents: 11638,
      type: "debit",
    });
    expect(
      suggestions.map((suggestion) => suggestion.suggestedName)
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/SUBSCRIPTION SERVICE/),
        expect.stringMatching(/UTILITY ELECTRIC/),
      ])
    );
  });

  it("filters_transfer_and_fee_noise_from_generic_fixture", () => {
    const statementText = readFixture("generic-transfer-noise.txt");
    const result = parseBankStatementImport(statementText, parseOptions);
    const suggestions = parseCsvImportSuggestions(statementText, parseOptions);

    expect(result.diagnostics.ignoredOrdinarySpendingCount).toBeGreaterThanOrEqual(5);
    expect(suggestions.map((suggestion) => suggestion.suggestedName)).toEqual([
      "FPL ELECTRIC",
      "NETFLIX",
      "USPS PAYROLL DIRECT DEP",
    ]);
    expect(
      result.transactions.filter(
        (transaction) => transaction.classification === "ignored_ordinary_spending"
      ).length
    ).toBeGreaterThanOrEqual(5);
  });

  it("validates_real_world_estmt_regression_fixture", () => {
    const statementText = readFixture("bofa-estmt-2026-06-05.txt");
    const result = parseBankStatementImport(statementText, parseOptions);
    const suggestions = parseCsvImportSuggestions(statementText, parseOptions);
    const suggestionNames = suggestions.map((suggestion) => suggestion.suggestedName);

    expect(result.transactions.length).toBeGreaterThanOrEqual(100);
    expect(suggestions.length).toBeGreaterThanOrEqual(10);
    expect(suggestions.length).toBeLessThanOrEqual(25);
    expect(suggestions.length).toBeLessThan(result.transactions.length);
    expect(
      suggestionNames.some((name) => /PAYROLL|FED SALARY/.test(name))
    ).toBe(true);
    expect(
      suggestions.some(
        (suggestion) =>
          suggestion.suggestionKind === "income" &&
          /PAYROLL|FED SALARY/.test(suggestion.suggestedName)
      )
    ).toBe(true);
    expect(
      suggestionNames.some((name) =>
        /GEICO|PARAMOUNT|YOUTUBE|FLEXJOBS|AFFIRM/.test(name)
      )
    ).toBe(true);
    expect(
      suggestionNames.some((name) =>
        /ZELLE|VENMO|CASH APP|OVERDRAFT|CRCARDPMT/.test(name)
      )
    ).toBe(false);
  });
});
