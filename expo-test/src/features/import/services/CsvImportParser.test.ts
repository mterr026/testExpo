import { describe, expect, it } from "vitest";

import {
  createStatementImportDiagnostics,
  parseCsvImportSuggestions,
} from "./CsvImportParser";

describe("parseCsvImportSuggestions", () => {
  it("detects_monthly_recurring_expense_candidates_from_csv", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Amount,Balance
2026-01-05,ATT Internet,-80.00,920.00
2026-02-05,ATT Internet,-80.00,840.00
2026-03-05,ATT Internet,-80.00,760.00
2026-03-08,Coffee Shop,-6.25,753.75`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 8000,
        suggestedDate: "2026-03-05",
        suggestionKind: "bill",
        suggestedName: "ATT Internet",
      },
    ]);
  });

  it("handles_quoted_csv_cells_and_detects_biweekly_intervals", () => {
    const suggestions = parseCsvImportSuggestions(`Transaction Date,Payee,Amount
"06/01/2026","Gym, Downtown",-35.50
"06/15/2026","Gym, Downtown",-35.50
"06/29/2026","Gym, Downtown",-35.50`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "biweekly",
        occurrenceCount: 3,
        suggestedAmountCents: 3550,
        suggestedDate: "2026-06-29",
        suggestionKind: "bill",
        suggestedName: "Gym, Downtown",
      },
    ]);
  });

  it("detects_positive_debit_columns_from_bank_statement_csv", () => {
    const suggestions = parseCsvImportSuggestions(`Posted,Details,Debit,Credit
01/05/2026,Streaming Service,12.99,
02/05/2026,Streaming Service,12.99,
03/05/2026,Streaming Service,12.99,
03/07/2026,Payroll,,1800.00`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 1299,
        suggestedDate: "2026-03-05",
        suggestionKind: "bill",
        suggestedName: "Streaming Service",
      },
    ]);
  });

  it("detects_recurring_income_from_credit_columns", () => {
    const suggestions = parseCsvImportSuggestions(`Posted,Details,Debit,Credit
01/05/2026,USPS Payroll,,2000.00
01/19/2026,USPS Payroll,,2000.00
02/02/2026,USPS Payroll,,2000.00
02/05/2026,Streaming Service,12.99,`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "biweekly",
        occurrenceCount: 3,
        suggestedAmountCents: 200000,
        suggestedDate: "2026-02-02",
        suggestionKind: "income",
        suggestedName: "USPS Payroll",
      },
    ]);
  });

  it("uses_credit_column_when_debit_column_is_empty", () => {
    const suggestions = parseCsvImportSuggestions(
      `Posted,Details,Debit,Credit
06/01/2026,Direct Deposit Payroll,,2000.00
06/03/2026,Gas Station,31.25,`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 200000,
        suggestedDate: "2026-06-01",
        suggestionKind: "income",
        suggestedName: "Direct Deposit Payroll",
      },
    ]);
  });

  it("uses_debit_column_position_before_income_text_clues", () => {
    const suggestions = parseCsvImportSuggestions(
      `Posted,Details,Debit,Credit
06/01/2026,VA CHECK,2200.00,
06/02/2026,Coffee Shop,6.25,`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("uses_credit_column_position_before_debit_text_clues", () => {
    const suggestions = parseCsvImportSuggestions(
      `Posted,Details,Debit,Credit
06/01/2026,CHECK DEPOSIT,,2200.00
06/02/2026,Coffee Shop,6.25,`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("detects_income_when_transaction_type_contains_credit_keywords", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Type,Amount
01/05/2026,USPS,ACH CREDIT PAYROLL,2000.00
01/19/2026,USPS,ACH CREDIT PAYROLL,2000.00
02/02/2026,USPS,ACH CREDIT PAYROLL,2000.00`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "biweekly",
        occurrenceCount: 3,
        suggestedAmountCents: 200000,
        suggestedDate: "2026-02-02",
        suggestionKind: "income",
        suggestedName: "USPS",
      },
    ]);
  });

  it("detects_seeded_payroll_processors_as_income", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Amount
01/05/2026,ADP Payroll 12345,1842.12
01/19/2026,ADP Payroll 67890,1842.12
02/02/2026,ADP Payroll 24680,1842.12`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "biweekly",
        occurrenceCount: 3,
        suggestedAmountCents: 184212,
        suggestedDate: "2026-02-02",
        suggestionKind: "income",
        suggestedName: "ADP Payroll",
      },
    ]);
  });

  it("detects_bills_when_transaction_type_contains_debit_keywords", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Type,Amount
01/05/2026,ATT Internet,ONLINE PAYMENT DEBIT,80.00
02/05/2026,ATT Internet,ONLINE PAYMENT DEBIT,80.00
03/05/2026,ATT Internet,ONLINE PAYMENT DEBIT,80.00`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 8000,
        suggestedDate: "2026-03-05",
        suggestionKind: "bill",
        suggestedName: "ATT Internet",
      },
    ]);
  });

  it("detects_seeded_utility_abbreviations_as_bills", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Amount
01/10/2026,FPL AUTO PAY,-142.55
02/10/2026,FPL AUTO PAY,-142.55
03/10/2026,FPL AUTO PAY,-142.55`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 14255,
        suggestedDate: "2026-03-10",
        suggestionKind: "bill",
        suggestedName: "FPL",
      },
    ]);
  });

  it("detects_common_benefit_income_from_statement_text", () => {
    const suggestions = parseCsvImportSuggestions(`01/01/2026 VA Benefits 1200.00
02/01/2026 VA Benefits 1200.00
03/01/2026 VA Benefits 1200.00`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 120000,
        suggestedDate: "2026-03-01",
        suggestionKind: "income",
        suggestedName: "VA Benefits",
      },
    ]);
  });

  it("flags_single_credit_column_transactions_as_possible_income", () => {
    const suggestions = parseCsvImportSuggestions(
      `Posted,Details,Debit,Credit
06/14/2026,ACH CREDIT FROM WORK,,975.42
06/15/2026,Coffee Shop,6.25,`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("flags_single_deposit_section_transactions_as_possible_income", () => {
    const suggestions = parseCsvImportSuggestions(
      `Bank statement period June 1, 2026 through June 30, 2026
Deposits and other credits
06/14 Refund From School 325.00
Withdrawals and other debits
06/15 Coffee Shop 6.25`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("detects_positive_amounts_when_transaction_type_is_debit", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Type,Amount
01/05/2026,Streaming Service,Debit,12.99
02/05/2026,Streaming Service,Debit,12.99
03/05/2026,Payroll,Deposit,1800.00`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 2,
        suggestedAmountCents: 1299,
        suggestedDate: "2026-02-05",
        suggestionKind: "bill",
        suggestedName: "Streaming Service",
      },
    ]);
  });

  it("detects_recurring_merchants_when_amounts_vary", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Amount
2026-01-15,Electric Utility Autopay Ref 10001,-114.22
2026-02-15,Electric Utility Autopay Ref 10002,-119.80
2026-03-15,Electric Utility Autopay Ref 10003,-121.10`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 12110,
        suggestedDate: "2026-03-15",
        suggestionKind: "bill",
        suggestedName: "Electric Utility",
      },
    ]);
  });

  it("detects_recurring_expenses_from_copied_statement_text", () => {
    const suggestions = parseCsvImportSuggestions(`01/05/2026 Streaming Service -12.99
02/05/2026 Streaming Service -12.99
03/05/2026 Streaming Service -12.99
03/06/2026 Corner Store -8.24`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 1299,
        suggestedDate: "2026-03-05",
        suggestionKind: "bill",
        suggestedName: "Streaming Service",
      },
    ]);
  });

  it("detects_positive_debit_lines_from_copied_statement_text", () => {
    const suggestions = parseCsvImportSuggestions(`01/15/2026 Electric Utility 114.22 Debit
02/15/2026 Electric Utility 119.80 Debit
03/15/2026 Electric Utility 121.10 Debit
03/31/2026 Payroll 1800.00 Deposit`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 12110,
        suggestedDate: "2026-03-15",
        suggestionKind: "bill",
        suggestedName: "Electric Utility",
      },
    ]);
  });

  it("detects_bill_candidates_from_multiline_ocr_statement_text", () => {
    const suggestions = parseCsvImportSuggestions(
      `Transactions
Date
Description
Amount
01/15/2026
Electric Utility
Online Bill Pay
114.22 Debit
01/16/2026
Corner Store
7.50 Debit`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 11422,
        suggestedDate: "2026-01-15",
        suggestionKind: "bill",
        suggestedName: "Electric Utility",
      },
    ]);
  });

  it("detects_bill_candidates_from_ocr_text_with_statement_year", () => {
    const suggestions = parseCsvImportSuggestions(
      `Bank statement period June 1, 2026 through June 30, 2026
06/18
ATT Internet
200.00
06/20
Coffee Shop
6.25`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 20000,
        suggestedDate: "2026-06-18",
        suggestionKind: "bill",
        suggestedName: "ATT Internet",
      },
    ]);
  });

  it("detects_income_from_ocr_statement_table_rows_with_balance_column", () => {
    const suggestions = parseCsvImportSuggestions(
      `Statement of Account
Statement period October 1, 2026 through November 9, 2026
Account Transactions by date with daily balance information
Date Description Debit Credit Balance
10/02 POS PURCHASE 4.23 65.73
10/03 PREAUTHORIZED CREDIT 763.01 828.74
10/04 POS PURCHASE 11.68 817.06
10/16 PREAUTHORIZED CREDIT 763.01 1216.92
10/31 PREAUTHORIZED CREDIT 350.00 650.68
11/09 SERVICE CHARGE 12.00 586.71`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("treats_positive_va_check_table_rows_as_possible_income", () => {
    const suggestions = parseCsvImportSuggestions(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Debit Credit Balance
06/01 VA CHECK 2200.00 4200.00
06/02 CHECK CARD PURCHASE 18.42 4181.58`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 220000,
        suggestedDate: "2026-06-01",
        suggestionKind: "income",
        suggestedName: "VA CHECK",
      },
    ]);
  });

  it("uses_running_balance_increase_as_income_even_when_words_are_ambiguous", () => {
    const suggestions = parseCsvImportSuggestions(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Amount Balance
06/01 CHECK CARD 100.00 1000.00
06/02 VA CHECK 2200.00 3200.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 220000,
        suggestedDate: "2026-06-02",
        suggestionKind: "income",
        suggestedName: "VA CHECK",
      },
    ]);
  });

  it("uses_running_balance_increase_as_income_without_income_keywords", () => {
    const suggestions = parseCsvImportSuggestions(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Amount Balance
06/01 CHECK CARD 100.00 1000.00
06/02 RANDOM ENTRY 2200.00 3200.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("detects_recurring_income_from_balance_direction_without_income_keywords", () => {
    const suggestions = parseCsvImportSuggestions(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Amount Balance
06/01 CHECK CARD 100.00 1000.00
06/05 RANDOM ENTRY 1800.00 2800.00
06/06 CHECK CARD 25.00 2775.00
06/19 RANDOM ENTRY 1800.00 4575.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("uses_running_balance_decrease_as_outgoing_even_when_words_are_ambiguous", () => {
    const suggestions = parseCsvImportSuggestions(
      `Statement period June 1, 2026 through June 30, 2026
Date Description Amount Balance
06/01 CHECK CARD 100.00 3200.00
06/02 VA CHECK 2200.00 1000.00`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("detects_common_billers_from_single_statement_occurrences", () => {
    const suggestions = parseCsvImportSuggestions(
      `Bank statement period June 1, 2026 through June 30, 2026
06/18 AT&T Payment 200.00
06/19 Duke Energy 115.42
06/20 Coffee Shop 6.25`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 20000,
        suggestedDate: "2026-06-18",
        suggestionKind: "bill",
        suggestedName: "AT&T",
      },
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 11542,
        suggestedDate: "2026-06-19",
        suggestionKind: "bill",
        suggestedName: "Duke Energy",
      },
    ]);
  });

  it("detects_ocr_lines_when_amount_appears_before_merchant", () => {
    const suggestions = parseCsvImportSuggestions(
      `Bank statement period June 1, 2026 through June 30, 2026
06/18 200.00 AT&T
06/20 6.25 Coffee Shop`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 20000,
        suggestedDate: "2026-06-18",
        suggestionKind: "bill",
        suggestedName: "AT&T",
      },
    ]);
  });

  it("treats_positive_amounts_in_withdrawal_sections_as_expenses", () => {
    const suggestions = parseCsvImportSuggestions(
      `Bank statement period June 1, 2026 through June 30, 2026
Deposits and other credits
06/15 Payroll 1800.00
Withdrawals and other debits
06/18 AT&T 200.00
06/19 Duke Energy 115.42`,
      {
        includeSingleOccurrenceCandidates: true,
        parseAsStatementText: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 20000,
        suggestedDate: "2026-06-18",
        suggestionKind: "bill",
        suggestedName: "AT&T",
      },
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 11542,
        suggestedDate: "2026-06-19",
        suggestionKind: "bill",
        suggestedName: "Duke Energy",
      },
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 180000,
        suggestedDate: "2026-06-15",
        suggestionKind: "income",
        suggestedName: "Payroll",
      },
    ]);
  });

  it("summarizes_statement_import_diagnostics_without_raw_text", () => {
    const diagnostics = createStatementImportDiagnostics(`Statement year 2026
06/18
ATT Internet
200.00
06/20 Coffee Shop 6.25`);

    expect(diagnostics).toMatchObject({
      amountLineCount: 2,
      creditTransactionCount: 0,
      dateLineCount: 2,
      debitTransactionCount: 2,
      lineCount: 5,
      parsedTransactionCount: 2,
      stitchedLineCount: 2,
      transactionSamples: [
        {
          amountCents: 20000,
          date: "2026-06-18",
          merchant: "ATT Internet",
          transactionType: "debit",
        },
        {
          amountCents: 625,
          date: "2026-06-20",
          merchant: "Coffee Shop",
          transactionType: "debit",
        },
      ],
    });
  });

  it("strips_sensitive_identifiers_from_suggested_names", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Merchant,Amount
2026-01-10,Water Utility Account 123456789,-48.25
2026-02-10,Water Utility Account 987654321,-48.25`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 2,
        suggestedAmountCents: 4825,
        suggestedDate: "2026-02-10",
        suggestionKind: "bill",
        suggestedName: "Water Utility",
      },
    ]);
  });

  it("ignores_income_and_non_recurring_expenses", () => {
    const suggestions = parseCsvImportSuggestions(`Date,Description,Amount
2026-01-01,Paycheck,1800.00
2026-01-02,Groceries,-84.12
2026-01-03,Gas,-32.10`);

    expect(suggestions).toEqual([]);
  });

  it("excludes_low_value_ordinary_spending_from_single_occurrence_suggestions", () => {
    const suggestions = parseCsvImportSuggestions(
      `Date,Description,Amount
2026-06-02,Coffee Shop,-4.82
2026-06-03,Coffee Shop,-7.15
2026-06-04,Coffee Shop,-5.44
2026-06-06,Corner Market,-9.35
2026-06-10,Gas Station,-11.25`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("does_not_turn_a_full_statement_into_import_suggestions", () => {
    const suggestions = parseCsvImportSuggestions(
      `Posted,Details,Debit,Credit
06/01/2026,USPS Payroll,,2000.00
06/01/2026,Publix,,650.00
06/02/2026,Coffee Shop,6.25,
06/03/2026,Gas Station,31.25,
06/04/2026,Grocery Store,84.12,
06/05/2026,Friend Transfer,,45.00
06/06/2026,Card Reward,,2.14
06/07/2026,Restaurant,52.40,
06/15/2026,Klarna Installment,9.99,
06/29/2026,Klarna Installment,9.99,`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "biweekly",
        occurrenceCount: 2,
        suggestedAmountCents: 999,
        suggestedDate: "2026-06-29",
        suggestionKind: "bill",
        suggestedName: "Klarna Installment",
      },
      {
        detectedInterval: "irregular",
        occurrenceCount: 1,
        suggestedAmountCents: 200000,
        suggestedDate: "2026-06-01",
        suggestionKind: "income",
        suggestedName: "USPS Payroll",
      },
    ]);
  });

  it("keeps_small_repeated_installments_as_possible_bills", () => {
    const suggestions = parseCsvImportSuggestions(
      `Date,Description,Amount
2026-06-01,Klarna Installment,-9.99
2026-06-15,Klarna Installment,-9.99
2026-06-29,Klarna Installment,-9.99`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([
      {
        detectedInterval: "biweekly",
        occurrenceCount: 3,
        suggestedAmountCents: 999,
        suggestedDate: "2026-06-29",
        suggestionKind: "bill",
        suggestedName: "Klarna Installment",
      },
    ]);
  });

  it("keeps_high_impact_one_time_debits_for_review", () => {
    const suggestions = parseCsvImportSuggestions(
      `Date,Description,Amount
2026-06-03,Coffee Shop,-4.82
2026-06-04,Gas Station,-31.25
2026-06-15,Unknown Contractor,-450.00`,
      {
        includeSingleOccurrenceCandidates: true,
      }
    );

    expect(suggestions).toEqual([]);
  });

  it("detects_recurring_income_from_plain_statement_text", () => {
    const suggestions = parseCsvImportSuggestions(`01/05/2026 USPS Paycheck 1800.00
02/05/2026 USPS Paycheck 1800.00
03/05/2026 USPS Paycheck 1800.00`);

    expect(suggestions).toEqual([
      {
        detectedInterval: "monthly",
        occurrenceCount: 3,
        suggestedAmountCents: 180000,
        suggestedDate: "2026-03-05",
        suggestionKind: "income",
        suggestedName: "USPS Paycheck",
      },
    ]);
  });

  it("rejects_csv_without_required_columns", () => {
    expect(() =>
      parseCsvImportSuggestions(`Posted,Details
2026-01-01,ATT Internet`)
    ).toThrow("CSV import requires date, merchant, and amount columns.");
  });
});
