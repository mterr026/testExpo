import { describe, expect, it } from "vitest";

import { calculateOutlierCoefficient } from "./outlierCoefficient";
import { classifyTransactionDescription } from "./transactionClassifier";
import { mapCategoryToSuggestion } from "./suggestionMapper";

describe("classifyTransactionDescription", () => {
  it.each([
    ["PAYROLL USPS DES:FED SALARY ID:254839870115851 INDN:TERRELL MATTHEW", "payroll_income"],
    ["VACP TREAS 310 DES:XXVA BENEF", "government_benefit"],
    ["FPL DIRECT DEBIT DES:ELEC PYMT", "utility"],
    ["LAKEVIEW LN SRV DES:MTG PYMT", "mortgage"],
    ["GEICO AUTO", "insurance"],
    ["CAPITAL ONE CRCARDPMT", "credit_card_payment"],
    ["ROCKETLOANS", "loan"],
    ["IRS USATAXPYMT", "tax_payment"],
    ["ATT PAYMENT", "phone_internet"],
    ["AFFIRM PAY", "installment"],
    ["KLARNA", "installment"],
    ["NETFLIX", "subscription"],
    ["SPOTIFY", "subscription"],
    ["YOUTUBE PREMIUM", "subscription"],
    ["GOOGLE YOUTUBE", "subscription"],
    ["CHECKCARD 0525 GOOGLE *YouTub Mountain ViewCA", "subscription"],
    ["PARAMOUNT+", "subscription"],
    ["APPLE.COM/BILL", "subscription"],
    ["OPENAI CHATGPT", "subscription"],
    ["UDEMY SUBSCRIPTION", "subscription"],
    ["PUBLIX", "grocery"],
    ["WAWA", "gas"],
    ["SHELL", "gas"],
    ["SUNOCO", "gas"],
    ["CHEVRON", "gas"],
    ["EXXON", "gas"],
    ["RACETRAC", "gas"],
    ["QT", "gas"],
    ["MCDONALDS", "restaurant"],
    ["UBER EATS", "restaurant"],
    ["STARBUCKS COFFEE", "restaurant"],
    ["PAPA JOHNS", "restaurant"],
    ["POPEYES", "restaurant"],
    ["SMOOTHIE KING", "restaurant"],
    ["RESTAURANT", "restaurant"],
    ["GOLF CLUB", "entertainment"],
    ["VENDING MACHINE", "misc_purchase"],
    ["MONTHLY MAINTENANCE FEE", "fee"],
  ] as const)("classifies %s as %s", (description, category) => {
    expect(classifyTransactionDescription(description)).toMatchObject({
      category,
    });
  });

  it("normalizes_bank_noise_without_losing_meaningful_income_words", () => {
    const prediction = classifyTransactionDescription(
      "PAYROLL USPS DES:FED SALARY ID:254839870115851 INDN:TERRELL MATTHEW"
    );

    expect(prediction.normalized.normalizedDescription).toBe(
      "USPS PAYROLL"
    );
    expect(prediction.confidence).toBeGreaterThanOrEqual(60);
  });

  it("keeps_card_purchase_prefixes_from_overpowering_the_merchant", () => {
    const prediction = classifyTransactionDescription(
      "CHECKCARD 0603 NETFLIX COM LOS GATOS CA"
    );

    expect(prediction.normalized.normalizedDescription).toContain("NETFLIX");
    expect(prediction.category).toBe("subscription");
  });

  it("supports_future_local_training_adjustments", () => {
    const prediction = classifyTransactionDescription("OPENAI CHATGPT", [
      {
        category: "subscription",
        normalizedMerchant: "OPENAI",
        weightAdjustment: 20,
      },
    ]);

    expect(prediction.category).toBe("subscription");
    expect(prediction.confidence).toBeGreaterThanOrEqual(90);
  });
});

describe("mapCategoryToSuggestion", () => {
  it("keeps_debit_and_credit_direction_as_absolute_boundaries", () => {
    expect(
      mapCategoryToSuggestion({
        category: "payroll_income",
        categoryConfidence: 100,
        direction: "debit",
      })
    ).toBe("needs_review");
    expect(
      mapCategoryToSuggestion({
        category: "utility",
        categoryConfidence: 100,
        direction: "credit",
      })
    ).toBe("needs_review");
  });

  it("maps_budget_flow_categories_to_suggestion_types", () => {
    expect(
      mapCategoryToSuggestion({
        category: "government_benefit",
        categoryConfidence: 80,
        direction: "credit",
      })
    ).toBe("likely_income");
    expect(
      mapCategoryToSuggestion({
        category: "subscription",
        categoryConfidence: 80,
        direction: "debit",
      })
    ).toBe("possible_bill");
    expect(
      mapCategoryToSuggestion({
        category: "grocery",
        categoryConfidence: 80,
        direction: "debit",
      })
    ).toBe("ignored_ordinary_spending");
    expect(
      mapCategoryToSuggestion({
        category: "tax_payment",
        categoryConfidence: 80,
        direction: "debit",
      })
    ).toBe("needs_review");
    expect(
      mapCategoryToSuggestion({
        category: "credit_card_payment",
        categoryConfidence: 80,
        direction: "debit",
      })
    ).toBe("ignored_ordinary_spending");
    expect(
      mapCategoryToSuggestion({
        category: "fee",
        categoryConfidence: 80,
        direction: "debit",
      })
    ).toBe("ignored_ordinary_spending");
    expect(
      mapCategoryToSuggestion({
        category: "misc_purchase",
        categoryConfidence: 80,
        direction: "debit",
      })
    ).toBe("ignored_ordinary_spending");
  });
});

describe("calculateOutlierCoefficient", () => {
  it("treats_repeated_structural_transactions_as_predictable", () => {
    const transactions = [
      {
        amountCents: 180000,
        category: "mortgage",
        date: "2026-04-01",
        normalizedDescription: "LAKEVIEW MORTGAGE",
        type: "debit",
      },
      {
        amountCents: 180000,
        category: "mortgage",
        date: "2026-05-01",
        normalizedDescription: "LAKEVIEW MORTGAGE",
        type: "debit",
      },
      {
        amountCents: 180000,
        category: "mortgage",
        date: "2026-06-01",
        normalizedDescription: "LAKEVIEW MORTGAGE",
        type: "debit",
      },
    ] as const;

    expect(calculateOutlierCoefficient(transactions[2], transactions)).toBeLessThan(25);
  });

  it("treats_one_time_tax_payments_as_review_heavy_outliers", () => {
    const transactions = [
      {
        amountCents: 140000,
        category: "tax_payment",
        date: "2026-06-18",
        normalizedDescription: "IRS USATAXPYMT",
        type: "debit",
      },
      {
        amountCents: 1999,
        category: "subscription",
        date: "2026-06-05",
        normalizedDescription: "NETFLIX",
        type: "debit",
      },
    ] as const;

    expect(calculateOutlierCoefficient(transactions[0], transactions)).toBeGreaterThanOrEqual(80);
  });
});
