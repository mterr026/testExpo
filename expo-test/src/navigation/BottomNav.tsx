import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { colors, styles } from "@/shared/ui/styles";
import type { Screen } from "@/shared/ui/types";

type IconName = React.ComponentProps<typeof SymbolView>["name"];

export function BottomNav({
  active,
  bottomInset,
  onChange,
}: {
  active: Screen;
  bottomInset: number;
  onChange: (screen: Screen) => void;
}) {
  const screens: { name: Screen; icon: IconName }[] = [
    { name: "Dashboard", icon: { ios: "house.fill", android: "home", web: "home" } },
    {
      name: "Purchases",
      icon: {
        ios: "creditcard.fill",
        android: "credit_card",
        web: "credit_card",
      },
    },
    {
      name: "Bills",
      icon: {
        ios: "list.bullet.rectangle.fill",
        android: "receipt_long",
        web: "receipt_long",
      },
    },
    {
      name: "Paychecks",
      icon: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
    },
    {
      name: "Settings",
      icon: { ios: "gearshape.fill", android: "settings", web: "settings" },
    },
  ];

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 10) + 8 }]}>
      {screens.map((item) => (
        <Pressable
          key={item.name}
          style={({ pressed }) => [
            styles.navItem,
            active === item.name && styles.navItemActive,
            pressed && styles.pressed,
          ]}
          onPress={() => onChange(item.name)}
        >
          <SymbolView
            name={item.icon}
            tintColor={active === item.name ? colors.accentDark : colors.muted}
            size={20}
          />
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.navText, active === item.name && styles.navTextActive]}
          >
            {item.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

