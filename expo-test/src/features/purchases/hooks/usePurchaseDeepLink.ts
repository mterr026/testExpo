import { useEffect } from "react";
import { Linking, Platform } from "react-native";

type UsePurchaseDeepLinkInput = {
  onOpenAddPurchase: () => void;
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

      const normalizedUrl = url.toLowerCase();

      if (
        normalizedUrl.includes("add-purchase") ||
        normalizedUrl.includes("log-purchase")
      ) {
        onOpenAddPurchase();
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
