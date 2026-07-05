import { Text } from "react-native";

import { useStyles } from "./ThemeContext";

export function ScreenSectionTitle({ title }: { title: string }) {
  const styles = useStyles();
  return <Text style={styles.screenSectionTitle}>{title}</Text>;
}
