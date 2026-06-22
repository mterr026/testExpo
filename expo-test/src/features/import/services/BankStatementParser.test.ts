import { describe, expect, it } from "vitest";

import { parseBankStatementImport } from "./BankStatementParser";

describe("parseBankStatementImport", () => {
  it("extracts_a_normalized_ocr_statement_table_before_classifying_suggestions", () => {
    const result = parseBankStatementImport(
      `Budget Flow Bank Statement
Statement period June 1, 2026 through June 30, 2026
Date Description Debit Credit Balance
06/01 USPS PAYROLL 2486.75 7486.75
06/02 PUBLIX SUPERMARKET 84.12 7402.63
06/03 FLORIDA POWER AND LIGHT 142.55 7260.08
06/05 NETFLIX 19.99 7240.09
06/07 POS PURCHASE 11.25 7228.84
06/10 COMCAST 125.00 7103.84
06/14 KLARNA INSTALLMENT 9.99 7093.85
06/15 VA BENEFIT PAYMENT 1200.00 8293.85
06/18 ATT WIRELESS 88.00 8205.85
06/28 KLARNA INSTALLMENT 9.99 8195.86
06/29 CHECK 1001 42.00 8153.86`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(result.diagnostics).toMatchObject({
      creditsDetected: 2,
      debitsDetected: 9,
      totalTransactionsParsed: 11,
      unknownDetected: 0,
    });
    expect(result.transactions.length).toBeGreaterThan(4);
    expect(
      result.transactions.find(
        (transaction) => transaction.description === "PUBLIX SUPERMARKET"
      )
    ).toMatchObject({
      type: "debit",
      debitCents: 8412,
      creditCents: null,
    });
    expect(
      result.suggestions.possibleIncome.map((suggestion) => suggestion.suggestedName)
    ).toEqual(["USPS PAYROLL", "VA BENEFIT PAYMENT"]);
    expect(
      result.suggestions.possibleIncome.map((suggestion) => suggestion.suggestionKind)
    ).toEqual(["income", "income"]);
    expect(
      result.suggestions.likelyIncome.map((suggestion) => ({
        classification: suggestion.classification,
        name: suggestion.suggestedName,
      }))
    ).toEqual([
      { classification: "likely_income", name: "USPS PAYROLL" },
      { classification: "likely_income", name: "VA BENEFIT PAYMENT" },
    ]);
    expect(
      result.suggestions.likelyIncome.every(
        (suggestion) => suggestion.classificationConfidence >= 90
      )
    ).toBe(true);
    expect(
      result.suggestions.possibleIncome.some(
        (suggestion) => suggestion.suggestedName === "PUBLIX SUPERMARKET"
      )
    ).toBe(false);
    expect(
      result.transactions.find(
        (transaction) => transaction.description === "PUBLIX SUPERMARKET"
      )
    ).toMatchObject({
      classification: "ignored_ordinary_spending",
      type: "debit",
    });
    expect(
      result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)
    ).toEqual([
      "ATT WIRELESS",
      "COMCAST",
      "FLORIDA POWER AND LIGHT",
      "KLARNA INSTALLMENT",
      "NETFLIX",
    ]);
    expect(
      result.suggestions.possibleBills.find(
        (suggestion) => suggestion.suggestedName === "KLARNA INSTALLMENT"
      )
    ).toMatchObject({
      classification: "likely_bill",
      detectedInterval: "biweekly",
      occurrenceCount: 2,
      suggestedAmountCents: 999,
    });
    expect(
      result.suggestions.likelyBills.map((suggestion) => suggestion.suggestedName)
    ).toEqual([
      "ATT WIRELESS",
      "COMCAST",
      "FLORIDA POWER AND LIGHT",
    ]);
    expect(
      result.suggestions.possibleIncome.some((suggestion) =>
        /POS|CHECK/.test(suggestion.suggestedName)
      )
    ).toBe(false);
    expect(
      result.suggestions.reviewSuggested.some((suggestion) =>
        /POS/.test(suggestion.suggestedName)
      )
    ).toBe(false);
    expect(
      result.transactions.find(
        (transaction) => transaction.description === "POS PURCHASE"
      )
    ).toMatchObject({
      classification: "ignored_ordinary_spending",
      type: "debit",
    });
    expect(
      result.suggestions.needsReview.map((suggestion) => suggestion.suggestedName)
    ).toContain("CHECK");
  });

  it("keeps_pos_and_card_purchases_out_of_visible_import_suggestions", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Debit Credit Balance
06/01 USPS PAYROLL 2000.00 3000.00
06/02 POS PURCHASE 84.12 2915.88
06/03 DEBIT CARD PURCHASE 45.00 2870.88
06/04 CARD PURCHASE 33.20 2837.68`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );
    const visibleSuggestions = [
      ...result.suggestions.possibleBills,
      ...result.suggestions.possibleIncome,
      ...result.suggestions.reviewSuggested,
    ];

    expect(
      visibleSuggestions.some((suggestion) =>
        /POS|CARD PURCHASE/.test(suggestion.suggestedName)
      )
    ).toBe(false);
    expect(
      result.transactions
        .filter((transaction) =>
          /POS|CARD PURCHASE/.test(transaction.description)
        )
        .every(
          (transaction) =>
            transaction.classification === "ignored_ordinary_spending"
        )
    ).toBe(true);
  });

  it("keeps_va_payment_text_rows_as_income_before_generic_payment_debit_rules", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
06/15 VA BENEFIT PAYMENT 1200.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(result.transactions).toEqual([
      expect.objectContaining({
        creditCents: 120000,
        debitCents: null,
        description: "VA BENEFIT PAYMENT",
        type: "credit",
      }),
    ]);
    expect(result.suggestions.possibleIncome).toEqual([
      expect.objectContaining({
        suggestedAmountCents: 120000,
        suggestedName: "VA BENEFIT PAYMENT",
        suggestionKind: "income",
      }),
    ]);
  });

  it("uses_balance_validation_to_correct_amounts_that_ocr_places_in_the_wrong_column", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Amount Balance
06/01 STARTING PURCHASE 100.00 5000.00
06/02 VA BENEFIT PAYMENT 2486.75 7486.75`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(result.transactions[1]).toMatchObject({
      creditCents: 248675,
      debitCents: null,
      type: "credit",
    });
    expect(result.suggestions.possibleIncome).toEqual([
      expect.objectContaining({
        suggestedAmountCents: 248675,
        suggestedName: "VA BENEFIT PAYMENT",
        suggestionKind: "income",
      }),
    ]);
  });

  it("keeps_generic_credits_and_mobile_deposits_out_of_likely_income", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Debit Credit Balance
06/01 MOBILE DEPOSIT 500.00 1500.00
06/15 ACH CREDIT 200.00 1700.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(
      result.suggestions.likelyIncome.map((suggestion) => suggestion.suggestedName)
    ).toEqual([]);
    expect(
      result.suggestions.needsReview.map((suggestion) => suggestion.suggestedName)
    ).toContain("MOBILE DEPOSIT");
    expect(
      result.transactions.find(
        (transaction) => transaction.description === "MOBILE DEPOSIT"
      )
    ).toMatchObject({
      classification: "needs_review",
      type: "credit",
    });
    expect(
      result.suggestions.possibleIncome.map((suggestion) => suggestion.suggestedName)
    ).not.toContain("ACH CREDIT");
    expect(
      result.suggestions.needsReview.map((suggestion) => suggestion.suggestedName)
    ).toContain("ACH CREDIT");
  });

  it("keeps_tax_payments_and_ordinary_spending_out_of_bill_suggestions", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Debit Credit Balance
06/01 USPS PAYROLL 2500.00 6000.00
06/03 IRS USATAXPYMT 1400.00 4600.00
06/04 STARBUCKS COFFEE 6.25 4593.75
06/05 GOLF CLUB 58.00 4535.75
06/06 VENDING MACHINE 2.50 4533.25
06/07 FPL DIRECT DEBIT 142.55 4390.70`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(
      result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)
    ).toEqual(["FPL DIRECT DEBIT"]);
    expect(
      result.suggestions.needsReview.map((suggestion) => suggestion.suggestedName)
    ).toContain("IRS USATAXPYMT");
    expect(
      result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)
    ).not.toContain("IRS USATAXPYMT");
    expect(result.diagnostics.ignoredOrdinarySpendingCount).toBe(3);
  });
});
