import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { screenOrder } from "@/features/app/homeData";
import { colors, styles } from "@/shared/ui/styles";
import type { Screen } from "@/shared/ui/types";

type IconName = React.ComponentProps<typeof SymbolView>["name"];

const screenIcons: Record<Screen, IconName> = {
  Dashboard: { ios: "house.fill", android: "home", web: "home" },
  Purchases: {
    ios: "creditcard.fill",
    android: "credit_card",
    web: "credit_card",
  },
  Bills: {
    ios: "list.bullet.rectangle.fill",
    android: "receipt_long",
    web: "receipt_long",
  },
  Paychecks: {
    ios: "calendar",
    android: "calendar_month",
    web: "calendar_month",
  },
  Settings: { ios: "gearshape.fill", android: "settings", web: "settings" },
};

export function BottomNav({
  active,
  bottomInset,
  onChange,
}: {
  active: Screen;
  bottomInset: number;
  onChange: (screen: Screen) => void;
}) {
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 10) + 8 }]}>
      {screenOrder.map((name) => {
        const isPrimary = name === "Dashboard";
        const isActive = active === name;

        if (isPrimary) {
          return (
            <Pressable
              key={name}
              style={({ pressed }) => [
                styles.navItemPrimary,
                pressed && styles.pressed,
              ]}
              onPress={() => onChange(name)}
            >
              <View
                style={[
                  styles.navItemPrimaryButton,
                  isActive && styles.navItemPrimaryButtonActive,
                ]}
              >
                <SymbolView
                  name={screenIcons[name]}
                  tintColor={isActive ? colors.card : colors.accentDark}
                  size={28}
                />
              </View>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  styles.navTextPrimary,
                  isActive && styles.navTextPrimaryActive,
                ]}
              >
                {name}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={name}
            style={({ pressed }) => [
              styles.navItem,
              isActive && styles.navItemActive,
              pressed && styles.pressed,
            ]}
            onPress={() => onChange(name)}
          >
            <SymbolView
              name={screenIcons[name]}
              tintColor={isActive ? colors.accentDark : colors.muted}
              size={20}
            />
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.navText, isActive && styles.navTextActive]}
            >
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
