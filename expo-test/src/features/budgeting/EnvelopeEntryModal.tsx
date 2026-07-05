import { useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardDoneAccessory } from "@/shared/ui/components";
import { hapticConfirm } from "@/shared/ui/haptics";
import { SheetDragHandle } from "@/shared/ui/SheetDragHandle";
import { useStyles } from "@/shared/ui/ThemeContext";

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
  const styles = useStyles();
  const isEditing = mode === "edit";
  const amountInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible || isEditing) {
      return;
    }

    scrollRef.current?.scrollTo({ y: 0, animated: false });

    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [visible, isEditing]);

  async function handleSave() {
    void hapticConfirm();
    await onSave();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss} />
        <View style={[styles.sheet, styles.sheetScrollable]}>
          <SheetDragHandle />
          <ScrollView
            ref={scrollRef}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
          >
            <Text style={styles.sectionTitle}>
              {isEditing ? "Edit Envelope" : "Add Envelope"}
            </Text>
            <Text style={styles.helpText}>
              {isEditing
                ? "Update envelope settings for this paycheck cycle."
                : "Enter the allocation first — name is required before saving."}
            </Text>

            <Text style={styles.inputLabel}>Allocation per cycle</Text>
            <TextInput
              ref={amountInputRef}
              style={[
                styles.input,
                styles.purchaseInput,
                styles.purchaseAmountHeroInput,
              ]}
              placeholder="0.00"
              keyboardType="decimal-pad"
              inputAccessoryViewID={amountAccessoryId}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              value={allocation}
              onChangeText={onAllocationChange}
            />

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={[styles.input, styles.purchaseInput]}
              placeholder="Gas, groceries, dining..."
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              value={name}
              onChangeText={onNameChange}
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
              onPress={handleSave}
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
          </ScrollView>
          <KeyboardDoneAccessory nativeID={amountAccessoryId} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
