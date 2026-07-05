import { Text } from "react-native";

import { styles } from "./styles";

export function ScreenSectionTitle({ title }: { title: string }) {
  return <Text style={styles.screenSectionTitle}>{title}</Text>;
}
