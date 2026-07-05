import { View } from "react-native";

import { useStyles } from "./ThemeContext";

export function SheetDragHandle() {
  const styles = useStyles();
  return (
    <View style={styles.sheetDragHandleRow}>
      <View style={styles.sheetDragHandle} />
    </View>
  );
}
