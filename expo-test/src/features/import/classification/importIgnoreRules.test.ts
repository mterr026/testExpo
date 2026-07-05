import { describe, expect, it } from "vitest";

import { shouldHardIgnoreImportTransaction } from "./importIgnoreRules";

describe("shouldHardIgnoreImportTransaction", () => {
  it.each([
    ["ZELLE PAYMENT TO FRIEND", "debit", true],
    ["CASH APP TRANSFER", "debit", true],
    ["VENMO PAYMENT", "debit", true],
    ["PMNT SENT MOBILE", "debit", true],
    ["PMNT RCVD FROM JOHN", "credit", true],
    ["TRANSFER TO SAV 1234", "debit", true],
    ["TRANSFER FROM SAV 5678", "credit", true],
    ["ALBERT CORPORATION ACH", "debit", true],
    ["OVERDRAFT FEE", "debit", true],
    ["SERVICE FEE", "debit", true],
    ["DEBIT ADJUSTMENT", "debit", true],
    ["RETURN OF POSTED CHECK", "debit", true],
    ["DUPLICATE ITEM", "debit", true],
    ["CAPITAL ONE DES:CRCARDPMT", "debit", true],
    ["CRCARDPMT AUTOPAY", "debit", true],
    ["RETRY PYMT UTILITY", "debit", true],
    ["RETRY PAYMENT CARD", "debit", true],
    ["CITY OF HLLYWD PARKING", "debit", true],
    ["CITY OF HLLYWD RECURRING UTILITY", "debit", false],
    ["USPS PAYROLL DIRECT DEP", "credit", false],
    ["PAYROLL ACME CORPORATION", "credit", false],
    ["FPL DIRECT DEBIT DES:ELEC PYMT", "debit", false],
    ["NETFLIX SUBSCRIPTION", "debit", false],
  ] as const)(
    "returns %s ignore=%s for direction %s",
    (description, direction, expected) => {
      expect(shouldHardIgnoreImportTransaction(description, direction)).toBe(
        expected
      );
    }
  );
});
