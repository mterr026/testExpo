import { Text, View } from "react-native";

import { useStyles } from "@/shared/ui/ThemeContext";

export function HomeHeader() {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View style={styles.logoLockup}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>BF</Text>
        </View>
        <View>
          <Text style={styles.logo}>
            Budget <Text style={styles.logoAccent}>Flow</Text>
          </Text>
          <Text style={styles.subtitle}>Clarity for every pay cycle</Text>
        </View>
      </View>
    </View>
  );
}
