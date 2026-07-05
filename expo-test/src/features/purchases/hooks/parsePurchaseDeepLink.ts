import { parseDollarInputToCents } from "@/shared/currency";

export type PurchaseDeepLinkPrefill = {
  amountCents?: number;
  description?: string;
};

export function parsePurchaseDeepLink(url: string): PurchaseDeepLinkPrefill | null {
  const normalizedUrl = url.toLowerCase();

  if (
    !normalizedUrl.includes("add-purchase") &&
    !normalizedUrl.includes("log-purchase")
  ) {
    return null;
  }

  const queryStart = url.indexOf("?");

  if (queryStart === -1) {
    return {};
  }

  const params = new URLSearchParams(url.slice(queryStart + 1));
  const prefill: PurchaseDeepLinkPrefill = {};

  const amountCentsParam = params.get("amountCents") ?? params.get("amountcents");
  const amountParam = params.get("amount");

  if (amountCentsParam) {
    const parsed = Number.parseInt(amountCentsParam, 10);

    if (Number.isInteger(parsed) && parsed > 0) {
      prefill.amountCents = parsed;
    }
  } else if (amountParam) {
    const cents = parseDollarInputToCents(amountParam);

    if (cents !== null) {
      prefill.amountCents = cents;
    }
  }

  const description = params.get("description")?.trim();

  if (description) {
    prefill.description = description;
  }

  return prefill;
}
