import { useEffect } from "react";
import { Linking, Platform } from "react-native";

import type { PurchaseEntryPrefill } from "./usePurchaseEntryController";
import { parsePurchaseDeepLink } from "./parsePurchaseDeepLink";

type UsePurchaseDeepLinkInput = {
  onOpenAddPurchase: (prefill?: PurchaseEntryPrefill) => void;
};

export function usePurchaseDeepLink({
  onOpenAddPurchase,
}: UsePurchaseDeepLinkInput) {
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    function handleUrl(url: string | null) {
      if (!url) {
        return;
      }

      const prefill = parsePurchaseDeepLink(url);

      if (prefill !== null) {
        onOpenAddPurchase(prefill);
      }
    }

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {
        // Deep links are optional on unsupported platforms.
      });

    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [onOpenAddPurchase]);
}
