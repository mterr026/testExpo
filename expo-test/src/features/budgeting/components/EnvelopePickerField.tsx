import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import type { Envelope } from "@/database/repositories/types";
import { styles } from "@/shared/ui/styles";

type EnvelopeOption = Pick<Envelope, "id" | "name">;

type EnvelopePickerFieldProps = {
  label: string;
  envelopes: EnvelopeOption[];
  envelopeId: string | null;
  onChange: (envelopeId: string | null) => void;
};

export function EnvelopePickerField({
  label,
  envelopes,
  envelopeId,
  onChange,
}: EnvelopePickerFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedLabel =
    envelopeId == null
      ? "None"
      : (envelopes.find((envelope) => envelope.id === envelopeId)?.name ??
        "None");

  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.readOnlyField,
          pressed && styles.pressed,
        ]}
        onPress={() => setPickerOpen(true)}
      >
        <Text style={styles.readOnlyText}>{selectedLabel}</Text>
      </Pressable>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPickerOpen(false)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sectionTitle}>{label}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.settingsPreferenceRow,
                envelopeId == null && styles.navItemActive,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                onChange(null);
                setPickerOpen(false);
              }}
            >
              <Text style={styles.itemTitle}>None</Text>
              <Text style={styles.rowMetaText}>Unassigned spending</Text>
            </Pressable>

            {envelopes.map((envelope) => (
              <Pressable
                key={envelope.id}
                style={({ pressed }) => [
                  styles.settingsPreferenceRow,
                  envelopeId === envelope.id && styles.navItemActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  onChange(envelope.id);
                  setPickerOpen(false);
                }}
              >
                <Text style={styles.itemTitle}>{envelope.name}</Text>
              </Pressable>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setPickerOpen(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
