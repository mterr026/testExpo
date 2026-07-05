import { Modal, View } from "react-native";

import { ImportLoadingIndicator } from "@/features/import/components/ImportLoadingIndicator";
import {
  getImportLoadingLabel,
  type ImportPhase,
} from "@/features/import/importLoadingStatus";
import { useStyles } from "@/shared/ui/ThemeContext";

type ImportLoadingModalProps = {
  importPhase: ImportPhase | null;
  visible: boolean;
};

export function ImportLoadingModal({
  importPhase,
  visible,
}: ImportLoadingModalProps) {
  const styles = useStyles();
  const importLoadingLabel = importPhase
    ? getImportLoadingLabel(importPhase)
    : {
        subtitle: "Please wait while we process your statement.",
        title: "Importing...",
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
    >
      <View style={styles.importLoadingModalBackdrop}>
        <ImportLoadingIndicator
          subtitle={importLoadingLabel.subtitle}
          title={importLoadingLabel.title}
          variant="overlay"
        />
      </View>
    </Modal>
  );
}
