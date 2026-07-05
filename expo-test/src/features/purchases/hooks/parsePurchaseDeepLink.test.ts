import { describe, expect, it } from "vitest";

import { parsePurchaseDeepLink } from "./parsePurchaseDeepLink";

describe("parsePurchaseDeepLink", () => {
  it("returns null for unrelated urls", () => {
    expect(parsePurchaseDeepLink("expotest://settings")).toBeNull();
  });

  it("opens add purchase without prefill when there are no query params", () => {
    expect(parsePurchaseDeepLink("expotest://add-purchase")).toEqual({});
    expect(parsePurchaseDeepLink("expotest://log-purchase")).toEqual({});
  });

  it("parses dollar amount query params", () => {
    expect(parsePurchaseDeepLink("expotest://add-purchase?amount=25")).toEqual({
      amountCents: 2500,
    });
    expect(parsePurchaseDeepLink("expotest://add-purchase?amount=12.50")).toEqual({
      amountCents: 1250,
    });
  });

  it("parses amountCents query params", () => {
    expect(
      parsePurchaseDeepLink("expotest://add-purchase?amountCents=2500")
    ).toEqual({
      amountCents: 2500,
    });
  });

  it("parses optional description", () => {
    expect(
      parsePurchaseDeepLink(
        "expotest://add-purchase?amount=25&description=Coffee"
      )
    ).toEqual({
      amountCents: 2500,
      description: "Coffee",
    });
  });

  it("ignores invalid amounts", () => {
    expect(
      parsePurchaseDeepLink("expotest://add-purchase?amount=abc&amountCents=0")
    ).toEqual({});
  });
});
