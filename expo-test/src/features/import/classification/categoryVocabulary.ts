export type TransactionCategory =
  | "atm"
  | "business_income"
  | "cash_app"
  | "check"
  | "convenience_store"
  | "credit_card_payment"
  | "deposit"
  | "education"
  | "entertainment"
  | "gas"
  | "gig_income"
  | "government_benefit"
  | "grocery"
  | "installment"
  | "insurance"
  | "internal_transfer"
  | "loan"
  | "medical_payment"
  | "fee"
  | "misc_purchase"
  | "mortgage"
  | "payroll_income"
  | "personal_care"
  | "refund"
  | "rent"
  | "restaurant"
  | "retail"
  | "retirement_income"
  | "subscription"
  | "tax_payment"
  | "transfer"
  | "transfer_received"
  | "transfer_sent"
  | "travel"
  | "unknown"
  | "unknown_credit"
  | "utility"
  | "venmo"
  | "zelle"
  | "phone_internet";

export type CategoryKeyword = {
  aliases?: string[];
  token: string;
  weight: number;
};

export type CategoryVocabulary = Record<TransactionCategory, CategoryKeyword[]>;

export const categoryVocabulary: CategoryVocabulary = {
  payroll_income: [
    { token: "PAYROLL", weight: 50 },
    { token: "PAYCHECK", weight: 45 },
    { token: "SALARY", weight: 40 },
    { token: "WAGES", weight: 35 },
    { token: "NET PAY", weight: 45 },
    { token: "EARNINGS", weight: 40 },
    { token: "FED SALARY", weight: 45 },
    { token: "DIRECT DEP", weight: 35, aliases: ["DIRECT DEPOSIT", "DIR DEP"] },
    { token: "USPS", weight: 30, aliases: ["UNITED STATES POSTAL SERVICE", "POSTAL SERVICE"] },
    { token: "POST OFFICE", weight: 35 },
    { token: "DFAS", weight: 40 },
    { token: "OPM", weight: 35, aliases: ["OFFICE OF PERSONNEL"] },
  ],
  government_benefit: [
    { token: "VA CHECK", weight: 90 },
    { token: "VA BENEFIT", weight: 90, aliases: ["VA BENEF"] },
    { token: "VA", weight: 40, aliases: ["V A", "VACP"] },
    { token: "BENEFIT", weight: 35, aliases: ["BENEF", "BENEFITS"] },
    { token: "TREAS", weight: 20, aliases: ["TREASURY", "US TREASURY", "VACP TREAS"] },
    { token: "SSA", weight: 40, aliases: ["SOC SEC", "SOCIAL SECURITY"] },
    { token: "VETERANS", weight: 35, aliases: ["VETERANS AFFAIRS"] },
    { token: "CIV SERV", weight: 35, aliases: ["CIVIL SERVICE"] },
  ],
  retirement_income: [
    { token: "PENSION", weight: 45 },
    { token: "RETIREMENT", weight: 40 },
    { token: "ANNUITY", weight: 35 },
  ],
  gig_income: [
    { token: "UBER DRIVER", weight: 45 },
    { token: "LYFT", weight: 35 },
    { token: "DOORDASH", weight: 35 },
    { token: "INSTACART", weight: 35 },
  ],
  business_income: [
    { token: "STRIPE", weight: 35 },
    { token: "SQUARE", weight: 35 },
    { token: "SHOPIFY", weight: 35 },
    { token: "MERCHANT", weight: 20 },
  ],
  deposit: [
    { token: "DEPOSIT", weight: 35 },
    { token: "MOBILE DEPOSIT", weight: 50 },
    { token: "CHECK DEPOSIT", weight: 40 },
  ],
  transfer_received: [
    { token: "TRANSFER FROM", weight: 45 },
    { token: "ACH CREDIT", weight: 25 },
  ],
  refund: [
    { token: "REFUND", weight: 45 },
    { token: "REVERSAL", weight: 30 },
    { token: "RETURN", weight: 20 },
  ],
  unknown_credit: [],

  mortgage: [
    { token: "MORTGAGE", weight: 70, aliases: ["MTG"] },
    { token: "LAKEVIEW", weight: 60 },
    { token: "LOANCARE", weight: 50 },
    { token: "LN SRV", weight: 35 },
  ],
  rent: [
    { token: "RENT", weight: 70 },
    { token: "APARTMENTS", weight: 35 },
    { token: "PROPERTY", weight: 30 },
    { token: "PROPERTY MGMT", weight: 55, aliases: ["PROPERTY MANAGEMENT"] },
    { token: "LANDLORD", weight: 45 },
  ],
  utility: [
    { token: "FPL", weight: 80, aliases: ["FLORIDA POWER", "FLORIDA POWER AND LIGHT"] },
    { token: "ELECTRIC", weight: 45, aliases: ["ELEC"] },
    { token: "UTILITY", weight: 45 },
    { token: "WATER", weight: 35 },
    { token: "POWER", weight: 35 },
    { token: "DUKE ENERGY", weight: 70 },
    { token: "TECO", weight: 70 },
    { token: "JEA", weight: 65 },
    { token: "OUC", weight: 65 },
    { token: "SECO", weight: 60 },
    { token: "CITY OF", weight: 35 },
  ],
  phone_internet: [
    { token: "ATT", weight: 65, aliases: ["AT T", "AT&T"] },
    { token: "COMCAST", weight: 70, aliases: ["XFINITY"] },
    { token: "VERIZON", weight: 65 },
    { token: "TMOBILE", weight: 60, aliases: ["T MOBILE"] },
    { token: "WIRELESS", weight: 35 },
    { token: "INTERNET", weight: 40 },
    { token: "SPECTRUM", weight: 65 },
    { token: "CRICKET", weight: 60 },
    { token: "METRO PCS", weight: 55 },
  ],
  insurance: [
    { token: "GEICO", weight: 80 },
    { token: "INSURANCE", weight: 60 },
    { token: "PROGRESSIVE", weight: 65 },
    { token: "STATE FARM", weight: 65 },
    { token: "ALLSTATE", weight: 65 },
    { token: "USAA", weight: 70 },
    { token: "TRAVELERS", weight: 60 },
  ],
  loan: [
    { token: "ROCKETLOANS", weight: 80, aliases: ["ROCKET LOANS"] },
    { token: "SUNCOAST", weight: 70 },
    { token: "CREDIT UNION", weight: 65 },
    { token: "SPI*", weight: 55 },
    { token: "LOAN", weight: 55 },
    { token: "LENDING", weight: 45 },
    { token: "FINANCE", weight: 25 },
  ],
  credit_card_payment: [
    { token: "CRCARDPMT", weight: 80, aliases: ["CC PAYMENT", "CREDIT CARD PAYMENT"] },
    { token: "CAPITAL ONE", weight: 70 },
    { token: "CHASE CARD", weight: 60 },
    { token: "AMEX", weight: 55 },
    { token: "DISCOVER", weight: 55 },
  ],
  tax_payment: [
    { token: "IRS", weight: 80 },
    { token: "USATAXPYMT", weight: 80, aliases: ["TAX PYMT", "TAX PAYMENT"] },
    { token: "TAX", weight: 45 },
  ],
  subscription: [
    { token: "STREAMING SERVICE", weight: 80 },
    { token: "GYM", weight: 70 },
    { token: "NETFLIX", weight: 80 },
    { token: "SPOTIFY", weight: 80 },
    { token: "YOUTUBE", weight: 85, aliases: ["YOUTUBE PREMIUM", "YOUTUBEPREMIUM", "GOOGLE YOUTUBE", "GOOGLE YOUTUB"] },
    { token: "PARAMOUNT", weight: 75, aliases: ["PARAMOUNT+"] },
    { token: "APPLE COM BILL", weight: 70, aliases: ["APPLE.COM/BILL"] },
    { token: "OPENAI", weight: 70 },
    { token: "CHATGPT", weight: 70 },
    { token: "UDEMY SUBSCRIPTION", weight: 80 },
    { token: "FLEXJOBS", weight: 75 },
    { token: "PLAYSTATION", weight: 75 },
    { token: "PLUSHCARE", weight: 75 },
    { token: "ZOTLO", weight: 70 },
    { token: "PERPLEXITY", weight: 70 },
    { token: "SUBSCRIPTION", weight: 45 },
  ],
  installment: [
    { token: "KLARNA", weight: 80 },
    { token: "AFFIRM", weight: 80 },
    { token: "AFTERPAY", weight: 75 },
    { token: "INSTALLMENT", weight: 55 },
  ],
  medical_payment: [
    { token: "MEDICAL", weight: 50 },
    { token: "DENTAL", weight: 45 },
    { token: "PHARMACY", weight: 35 },
    { token: "HOSPITAL", weight: 45 },
  ],
  fee: [
    { token: "SERVICE CHARGE", weight: 80 },
    { token: "BANK FEE", weight: 70 },
    { token: "MAINTENANCE FEE", weight: 70 },
    { token: "OVERDRAFT", weight: 70 },
  ],

  grocery: [
    { token: "PUBLIX", weight: 80 },
    { token: "GROCERY", weight: 65 },
    { token: "SUPERMARKET", weight: 65 },
    { token: "KROGER", weight: 70 },
    { token: "ALDI", weight: 70 },
  ],
  gas: [
    { token: "WAWA", weight: 80 },
    { token: "SHELL", weight: 80 },
    { token: "SUNOCO", weight: 80 },
    { token: "CHEVRON", weight: 80 },
    { token: "EXXON", weight: 80 },
    { token: "RACETRAC", weight: 80 },
    { token: "QT", weight: 75 },
    { token: "GAS", weight: 55 },
    { token: "FUEL", weight: 55 },
  ],
  restaurant: [
    { token: "STARBUCKS", weight: 80 },
    { token: "COFFEE", weight: 60 },
    { token: "FAST FOOD", weight: 65 },
    { token: "MCDONALDS", weight: 80 },
    { token: "UBER EATS", weight: 80 },
    { token: "PAPA JOHNS", weight: 80 },
    { token: "POPEYES", weight: 80 },
    { token: "SMOOTHIE KING", weight: 80 },
    { token: "RESTAURANT", weight: 70 },
    { token: "DINING", weight: 55 },
  ],
  convenience_store: [
    { token: "CONVENIENCE", weight: 60 },
    { token: "7 ELEVEN", weight: 70 },
    { token: "CIRCLE K", weight: 70 },
  ],
  retail: [
    { token: "AMAZON", weight: 75 },
    { token: "WALMART", weight: 75 },
    { token: "TARGET", weight: 75 },
    { token: "STORE", weight: 35 },
    { token: "RETAIL", weight: 45 },
  ],
  entertainment: [
    { token: "GOLF", weight: 55 },
    { token: "MOVIE", weight: 40 },
    { token: "THEATER", weight: 40 },
    { token: "TICKET", weight: 30 },
  ],
  travel: [
    { token: "AIRLINE", weight: 45 },
    { token: "HOTEL", weight: 45 },
    { token: "TRAVEL", weight: 45 },
    { token: "UBER TRIP", weight: 40 },
  ],
  education: [
    { token: "SCHOOL", weight: 35 },
    { token: "TUITION", weight: 50 },
    { token: "COURSE", weight: 35 },
  ],
  personal_care: [
    { token: "SALON", weight: 45 },
    { token: "BARBER", weight: 45 },
    { token: "SPA", weight: 40 },
  ],
  misc_purchase: [
    { token: "VENDING", weight: 70 },
    { token: "PURCHASE", weight: 25 },
  ],

  transfer_sent: [
    { token: "TRANSFER TO", weight: 45 },
    { token: "ACH DEBIT", weight: 20 },
  ],
  internal_transfer: [
    { token: "TRANSFER", weight: 35 },
    { token: "INTERNAL TRANSFER", weight: 60 },
  ],
  cash_app: [
    { token: "CASH APP", weight: 80 },
    { token: "CASHAPP", weight: 80 },
  ],
  zelle: [{ token: "ZELLE", weight: 80 }],
  venmo: [{ token: "VENMO", weight: 80 }],
  check: [
    { token: "CHECK", weight: 70 },
    { token: "CHECKCARD", weight: 10 },
  ],
  atm: [{ token: "ATM", weight: 70 }],
  transfer: [{ token: "TRANSFER", weight: 30 }],
  unknown: [],
};

export function getCanonicalMerchantToken(normalizedDescription: string): string | null {
  const normalized = normalizedDescription.trim().toUpperCase();

  for (const keywords of Object.values(categoryVocabulary)) {
    for (const keyword of keywords) {
      if (normalized === keyword.token) {
        return keyword.token;
      }

      if (keyword.aliases?.some((alias) => normalized === alias.toUpperCase())) {
        return keyword.token;
      }
    }
  }

  return null;
}
