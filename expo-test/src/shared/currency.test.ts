import { describe, expect, it } from "vitest";

import {
  assertCents,
  formatCurrency,
  isPositiveCents,
  parseDollarInputToCents,
  parseDollarInputToNonNegativeCents,
} from "./currency";

describe("currency helpers", () => {
  it("parses dollar input into integer cents", () => {
    expect(parseDollarInputToCents("42")).toBe(4200);
    expect(parseDollarInputToCents("$42.10")).toBe(4210);
    expect(parseDollarInputToCents("  42.1 ")).toBe(4210);
    expect(parseDollarInputToCents("42.")).toBe(4200);
  });

  it("rejects invalid, negative, and zero positive-only amounts", () => {
    expect(parseDollarInputToCents("")).toBeNull();
    expect(parseDollarInputToCents("0")).toBeNull();
    expect(parseDollarInputToCents("-1.00")).toBeNull();
    expect(parseDollarInputToCents("1.234")).toBeNull();
    expect(parseDollarInputToCents("abc")).toBeNull();
  });

  it("allows zero only for non-negative parsing", () => {
    expect(parseDollarInputToNonNegativeCents("0")).toBe(0);
    expect(parseDollarInputToNonNegativeCents("$0.00")).toBe(0);
    expect(parseDollarInputToNonNegativeCents("0.01")).toBe(1);
  });

  it("identifies and asserts integer-cent values", () => {
    expect(isPositiveCents(1)).toBe(true);
    expect(isPositiveCents(0)).toBe(false);
    expect(isPositiveCents(1.5)).toBe(false);
    expect(() => assertCents(100)).not.toThrow();
    expect(() => assertCents(1.5, "test amount")).toThrow(
      "test amount must be stored as integer cents."
    );
  });

  it("formats cents as USD by default", () => {
    expect(formatCurrency(4210)).toBe("$42.10");
    expect(formatCurrency(-4210)).toBe("-$42.10");
  });
});
