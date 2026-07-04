import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardDoneAccessory } from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";

type EnvelopeEntryModalProps = {
  visible: boolean;
  mode: "add" | "edit";
  name: string;
  allocation: string;
  isPaused: boolean;
  error: string;
  amountAccessoryId: string;
  onNameChange: (text: string) => void;
  onAllocationChange: (text: string) => void;
  onIsPausedChange: (isPaused: boolean) => void;
  onSave: () => void | Promise<void>;
  onClose: () => void;
};

export function EnvelopeEntryModal({
  visible,
  mode,
  name,
  allocation,
  isPaused,
  error,
  amountAccessoryId,
  onNameChange,
  onAllocationChange,
  onIsPausedChange,
  onSave,
  onClose,
}: EnvelopeEntryModalProps) {
  const isEditing = mode === "edit";

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss} />
        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>
            {isEditing ? "Edit Envelope" : "Add Envelope"}
          </Text>
          <Text style={styles.helpText}>
            Set aside money for categories like gas or groceries each paycheck
            cycle.
          </Text>

          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={[styles.input, styles.purchaseInput]}
            placeholder="Gas, groceries, dining..."
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            value={name}
            onChangeText={onNameChange}
          />

          <Text style={styles.inputLabel}>Allocation per cycle</Text>
          <TextInput
            style={[styles.input, styles.purchaseInput]}
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputAccessoryViewID={amountAccessoryId}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            value={allocation}
            onChangeText={onAllocationChange}
          />

          {isEditing && (
            <>
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  style={({ pressed }) => [
                    styles.segmentedControlOption,
                    !isPaused && styles.segmentedControlOptionActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onIsPausedChange(false)}
                >
                  <Text
                    style={[
                      styles.segmentedControlText,
                      !isPaused && styles.segmentedControlTextActive,
                    ]}
                  >
                    Active
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.segmentedControlOption,
                    isPaused && styles.segmentedControlOptionActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onIsPausedChange(true)}
                >
                  <Text
                    style={[
                      styles.segmentedControlText,
                      isPaused && styles.segmentedControlTextActive,
                    ]}
                  >
                    Paused
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButtonTight,
              pressed && styles.pressed,
            ]}
            onPress={onSave}
          >
            <Text style={styles.primaryButtonText}>Save Envelope</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <KeyboardDoneAccessory nativeID={amountAccessoryId} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
