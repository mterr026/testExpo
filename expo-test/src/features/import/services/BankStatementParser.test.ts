import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBankStatementImport } from "./BankStatementParser";
import { extractTextFromPdfSource } from "./PdfTextExtraction";

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
      result.transactions.find(
        (transaction) => transaction.description === "MOBILE DEPOSIT"
      )
    ).toMatchObject({
      classification: "ignored_ordinary_spending",
      suggestionType: "ignored_ordinary_spending",
      type: "credit",
    });
    expect(
      result.suggestions.possibleIncome.map((suggestion) => suggestion.suggestedName)
    ).not.toContain("ACH CREDIT");
    expect(
      result.transactions.find(
        (transaction) => transaction.description === "ACH CREDIT"
      )
    ).toMatchObject({
      suggestionType: "ignored_ordinary_spending",
    });
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

  it("suggests_single_occurrence_structural_bills_on_a_one_month_statement", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
06/05 RENT PAYMENT APARTMENTS 1450.00 3550.00
06/07 TECO ENERGY ELECTRIC 182.44 3367.56
06/10 SPECTRUM INTERNET 79.99 3287.57`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)).toEqual([
      "RENT PAYMENT APARTMENTS",
      "SPECTRUM INTERNET",
      "TECO ENERGY ELECTRIC",
    ]);
  });

  it("promotes_the_largest_credit_to_paycheck_when_merchant_vocabulary_is_weak", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
06/01 ACME CORPORATION PAY 2450.00 5450.00
06/03 MOBILE DEPOSIT 500.00 5950.00
06/15 REFUND FROM STORE 42.00 5992.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    const acme = result.transactions.find(
      (transaction) => transaction.description === "ACME CORPORATION PAY"
    );

    expect(acme).toMatchObject({
      suggestionType: "likely_income",
      type: "credit",
    });
    expect(result.suggestions.possibleIncome.map((suggestion) => suggestion.suggestedName)).toEqual([
      "ACME CORPORATION PAY",
    ]);
    expect(
      result.transactions.find(
        (transaction) => transaction.description === "ACME CORPORATION PAY"
      )
    ).toMatchObject({
      suggestionType: "likely_income",
      type: "credit",
    });
    expect(
      result.suggestions.possibleIncome.some((suggestion) =>
        /MOBILE DEPOSIT|REFUND/.test(suggestion.suggestedName)
      )
    ).toBe(false);
  });

  it("detects_youtube_subscriptions_from_common_bank_statement_labels", () => {
    const result = parseBankStatementImport(
      `Statement period June 1, 2026 through June 30, 2026
06/04 GOOGLE YOUTUBEPREMIUM 13.99 2986.01
06/12 GOOGLE YOUTUBE G CO HELPPAY 13.99 2972.02`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)).toEqual([
      "YOUTUBE",
    ]);
    expect(
      result.transactions.find((transaction) =>
        transaction.normalizedDescription.includes("YOUTUBE")
      )
    ).toMatchObject({
      category: "subscription",
      suggestionType: "possible_bill",
    });
  });

  it("detects_truncated_google_youtube_labels_from_fragmented_ocr_text", () => {
    const result = parseBankStatementImport(
      `MATTHEW RYAN TERRELL Account # 2290 5488 3614 May 7, 2026 to June 5, 2026
Withdrawals and other subtractions
ATM and debit card subtractions
Date Description Amount
05/26/26 CHECKCARD 0525 GOOGLE *YouTub Mountain ViewCA -18.09
06/03/26 CHECKCARD 0603 NETFLIX COM LOS GATOS CA -30.54`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)).toEqual(
      expect.arrayContaining(["YOUTUBE", "NETFLIX"])
    );
    expect(
      result.transactions.find((transaction) => transaction.normalizedDescription === "YOUTUBE")
    ).toMatchObject({
      category: "subscription",
      suggestionType: "possible_bill",
      debitCents: 1809,
    });
  });

  it("pairs_detached_ocr_amount_lines_for_generic_multiline_subscriptions", () => {
    const result = parseBankStatementImport(
      `Generic Bank Statement
Statement period June 1, 2026 through June 30, 2026
Date Description Amount
06/03/26
CHECKCARD MERCHANT SUBSCRIPTION SERVICE
Reference 060326
-30.54
06/04/26 COFFEE SHOP 6.25`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(
      result.transactions.find((transaction) =>
        transaction.description.includes("SUBSCRIPTION SERVICE")
      )
    ).toMatchObject({
      debitCents: 3054,
      type: "debit",
    });
    expect(
      result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)
    ).not.toContain("SUBSCRIPTION SERVICE");
  });

  it("pairs_detached_payroll_credit_amounts_from_multiline_ocr_text", () => {
    const result = parseBankStatementImport(
      `Generic Bank Statement
Statement period June 1, 2026 through June 30, 2026
Deposits and other credits
06/15/26
USPS PAYROLL DIRECT DEP
Pay period ending 06/14
2808.07
Withdrawals and other debits
06/16/26 COFFEE SHOP 6.25`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

    expect(
      result.transactions.find((transaction) =>
        transaction.description.includes("PAYROLL")
      )
    ).toMatchObject({
      creditCents: 280807,
      type: "credit",
    });
    expect(
      result.suggestions.possibleIncome.map((suggestion) => suggestion.suggestedName)
    ).toEqual(expect.arrayContaining([expect.stringMatching(/USPS PAYROLL/)]));
  });

  it("pairs_two_column_ocr_fragments_for_subscriptions_and_utilities", () => {
    const result = parseBankStatementImport(
      `Generic Bank Account Statement
Statement period June 1, 2026 through June 30, 2026
Withdrawals
Date Description Amount
06/03/26 CHECKCARD MERCHANT SUBSCRIPTION SERVICE
06/03/26 UTILITY ELECTRIC DIRECT DEBIT DES:ELEC PYMT
06/04/26 CHECKCARD COFFEE SHOP
06/04/26 PURCHASE RETAIL STORE
Fort Lauderdale FL
-30.54
-116.38
-5.25
-42.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
        source: "pdf_ocr",
      }
    );

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
      result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/SUBSCRIPTION SERVICE/),
        expect.stringMatching(/UTILITY ELECTRIC/),
      ])
    );
  });

  it("detects_subscriptions_from_real_world_estmt_regression_layout", () => {
    const pdfPath = "/Users/matt/Downloads/eStmt_2026-06-05 2.pdf";
    const ocrStyleStatementText = `MATTHEW RYAN TERRELL Account # 2290 5488 3614 May 7, 2026 to June 5, 2026
Withdrawals and other subtractions
ATM and debit card subtractions
Date Description Amount
05/26/26 CHECKCARD 0525 GOOGLE *YouTub Mountain ViewCA -18.09
05/11/26 CHECKCARD 0510 GEICO *AUTO 8008413000 DC -242.40 RECURRING
05/18/26 CHECKCARD 0516 PARAMOUNT+ 8882745343 CA -15.83 RECURRING
06/03/26 CHECKCARD 0603 NETFLIX COM LOS GATOS CA -30.54
05/08/26 PAYROLL USPS DES:FED SALARY 2808.07`;

    if (existsSync(pdfPath)) {
      const pdfSource = readFileSync(pdfPath).toString("latin1");
      expect(extractTextFromPdfSource(pdfSource)).toBe("");
    }

    const result = parseBankStatementImport(ocrStyleStatementText, {
      includeSingleOccurrenceCandidates: true,
      parseAsStatementText: true,
      source: "pdf_ocr",
    });

    expect(
      result.suggestions.possibleBills.map((suggestion) => suggestion.suggestedName)
    ).toEqual(expect.arrayContaining(["YOUTUBE", "NETFLIX"]));
    expect(
      result.transactions.find((transaction) => transaction.normalizedDescription === "YOUTUBE")
    ).toMatchObject({
      category: "subscription",
      suggestionType: "possible_bill",
      debitCents: 1809,
    });
  });
});
