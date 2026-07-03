import { Modal, View } from "react-native";

import { ImportLoadingIndicator } from "@/features/import/components/ImportLoadingIndicator";
import {
  getImportLoadingLabel,
  type ImportPhase,
} from "@/features/import/importLoadingStatus";
import { styles } from "@/shared/ui/styles";

type ImportLoadingModalProps = {
  importPhase: ImportPhase | null;
  visible: boolean;
};

export function ImportLoadingModal({
  importPhase,
  visible,
}: ImportLoadingModalProps) {
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
