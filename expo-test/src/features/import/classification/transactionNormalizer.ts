export type NormalizedTransactionText = {
  compact: string;
  normalizedDescription: string;
  tokens: string[];
};

const BANK_CODE_PATTERNS = [
  /\bINDN\s*[:#]?\s*[A-Z]+(?:\s+[A-Z]+){0,2}/g,
  /\b(?:AUTH|AUTHORIZATION|CONF|CONFIRMATION|TRACE|TRN|REF|ID|CO ID|CCD|PPD|WEB)\s*[:#]?\s*[A-Z0-9-]+/g,
  /\b\d{4,}\b/g,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g,
  /\b(?:CA|FL|GA|NY|TX|WA|NC|SC|VA|AL|TN|OH|PA|IL|AZ|CO|NV|OR)\b$/g,
];

const DESCRIPTION_PREFIXES = [
  /^ACH\s+(?:DEBIT|CREDIT)\s+/,
  /^CHECKCARD\s+/,
  /^DEBIT\s+CARD\s+PURCHASE\s+/,
  /^CARD\s+PURCHASE\s+/,
  /^POS\s+PURCHASE\s+/,
  /^PURCHASE\s+/,
];

const TOKEN_REPLACEMENTS: [RegExp, string][] = [
  [/\bVACP\b/g, "VA"],
  [/\bXXVA\b/g, "VA"],
  [/\bBENEF\b/g, "BENEFIT"],
  [/\bPYMT\b/g, "PAYMENT"],
  [/\bPMT\b/g, "PAYMENT"],
  [/\bMTG\b/g, "MORTGAGE"],
  [/\bELEC\b/g, "ELECTRIC"],
  [/\bCRCARDPMT\b/g, "CRCARDPMT"],
  [/\bCHATGPT\b/g, "CHATGPT"],
];

const MERCHANT_NORMALIZATION_PATTERNS: [RegExp, string][] = [
  [/\bPAYROLL\b.*\bUSPS\b|\bUSPS\b.*\b(?:PAYROLL|SALARY)\b/g, "USPS PAYROLL"],
  [/\bVA\b.*\bBENEFIT\b|\bBENEFIT\b.*\bVA\b/g, "VA BENEFIT"],
  [/\bFPL\b.*\b(?:DIRECT|DEBIT|PAYMENT)\b|\bFLORIDA POWER\b.*/g, "FPL"],
  [/\bNETFLIX\b.*/g, "NETFLIX"],
  [/\bSPOTIFY\b.*/g, "SPOTIFY"],
  [/\bPARAMOUNT\b.*/g, "PARAMOUNT"],
  [/\bAPPLE\b\s+\bCOM\b\s+\bBILL\b.*/g, "APPLE COM BILL"],
  [/\bGOOGLE\b.*\bYOUTUB\w*\b.*/g, "YOUTUBE"],
  [/\bYOUTUBEPREMIUM\b.*/g, "YOUTUBE"],
  [/\bYOUTUBE\b.*/g, "YOUTUBE"],
];

export function normalizeTransactionDescription(
  description: string
): NormalizedTransactionText {
  let normalizedDescription = description
    .toUpperCase()
    .replace(/[*]/g, " ")
    .replace(/[+/]/g, " ")
    .replace(/[.]/g, " ")
    .replace(/[^A-Z0-9:&\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const prefix of DESCRIPTION_PREFIXES) {
    normalizedDescription = normalizedDescription.replace(prefix, "");
  }

  for (const pattern of BANK_CODE_PATTERNS) {
    normalizedDescription = normalizedDescription.replace(pattern, " ");
  }

  for (const [pattern, replacement] of TOKEN_REPLACEMENTS) {
    normalizedDescription = normalizedDescription.replace(pattern, replacement);
  }

  normalizedDescription = normalizedDescription
    .replace(/\b(?:DES|CO)\s*:\s*/g, " ")
    .replace(/\bDES\b/g, " ")
    .replace(/\bCO\b/g, " ")
    .replace(/\bINC\b/g, " ")
    .replace(/\bLLC\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of MERCHANT_NORMALIZATION_PATTERNS) {
    normalizedDescription = normalizedDescription.replace(pattern, replacement);
  }

  if (/\bUSPS PAYROLL\b/.test(normalizedDescription)) {
    normalizedDescription = "USPS PAYROLL";
  }

  if (/\bYOUTUBE\b/.test(normalizedDescription)) {
    normalizedDescription = "YOUTUBE";
  }

  if (
    /\bGOOGLE\b/.test(normalizedDescription) &&
    /\bYOUTUB\b/.test(normalizedDescription)
  ) {
    normalizedDescription = "YOUTUBE";
  }

  normalizedDescription = normalizedDescription.replace(/\s+/g, " ").trim();

  const tokens = normalizedDescription
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  return {
    compact: tokens.join("").replace(/[^A-Z0-9]/g, ""),
    normalizedDescription,
    tokens,
  };
}
