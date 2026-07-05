import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { styles } from "./styles";

export function ScreenShell({
  headerAction,
  subtitle,
  title,
}: {
  headerAction?: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.screenHeaderRow}>
      <View style={styles.itemCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.helpText}>{subtitle}</Text> : null}
      </View>
      {headerAction}
    </View>
  );
}
