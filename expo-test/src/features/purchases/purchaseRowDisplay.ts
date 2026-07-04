export {
  getPurchaseStatusLabel,
  getPurchaseStatusPresentation,
  getPurchaseStatusTone,
} from "@/shared/ui/statusBadges";

export function formatPurchaseDisplayName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Purchase";
  }

  const checkcardMatch = /^CHECKCARD\s+([^*]+?)(?:\s+\*.*)?$/i.exec(trimmed);

  if (checkcardMatch?.[1]) {
    return normalizePurchaseDisplayName(checkcardMatch[1].trim());
  }

  const beforeDescriptor = trimmed.split(/\s+DES:/i)[0]?.trim();

  return normalizePurchaseDisplayName(beforeDescriptor || trimmed);
}

function normalizePurchaseDisplayName(value: string) {
  const collapsed = value.replace(/\s{2,}/g, " ").trim();

  if (/^[A-Z0-9 .&'-]+$/.test(collapsed) && collapsed.length > 4) {
    return collapsed
      .toLowerCase()
      .replace(/\b([a-z])/g, (match) => match.toUpperCase());
  }

  return collapsed;
}
