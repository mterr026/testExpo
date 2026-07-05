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

import type { BillType } from "@/database/repositories/types";
import {
  DatePickerField,
  KeyboardDoneAccessory,
} from "@/shared/ui/components";
import { hapticConfirm } from "@/shared/ui/haptics";
import { SheetDragHandle } from "@/shared/ui/SheetDragHandle";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { BillRepeatMode } from "@/shared/ui/types";

type BillEntryModalProps = {
  visible: boolean;
  mode: "add" | "edit";
  name: string;
  amount: string;
  dueDate: string;
  repeatMode: BillRepeatMode;
  billType: BillType;
  error: string;
  amountAccessoryId: string;
  onNameChange: (text: string) => void;
  onAmountChange: (text: string) => void;
  onDueDateChange: (text: string) => void;
  onRepeatModeChange: (repeatMode: BillRepeatMode) => void;
  onBillTypeChange: (billType: BillType) => void;
  onSave: () => void | Promise<void>;
  onClose: () => void;
};

export function BillEntryModal({
  visible,
  mode,
  name,
  amount,
  dueDate,
  repeatMode,
  billType,
  error,
  amountAccessoryId,
  onNameChange,
  onAmountChange,
  onDueDateChange,
  onRepeatModeChange,
  onBillTypeChange,
  onSave,
  onClose,
}: BillEntryModalProps) {
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
              {isEditing ? "Edit Bill" : "Add Bill"}
            </Text>
            <Text style={styles.helpText}>
              {isEditing
                ? "Update bill details to keep Safe to Spend accurate."
                : "Enter the amount first — name is required before saving."}
            </Text>

            <Text style={styles.inputLabel}>Amount</Text>
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
              value={amount}
              onChangeText={onAmountChange}
            />

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={[styles.input, styles.purchaseInput]}
              placeholder="Rent, electric, phone..."
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              value={name}
              onChangeText={onNameChange}
            />

            <DatePickerField
              label="Due date"
              value={dueDate}
              onChange={onDueDateChange}
            />

            <Text style={styles.inputLabel}>Repeats</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                style={({ pressed }) => [
                  styles.segmentedControlOption,
                  repeatMode === "recurring" && styles.segmentedControlOptionActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onRepeatModeChange("recurring")}
              >
                <Text
                  style={[
                    styles.segmentedControlText,
                    repeatMode === "recurring" && styles.segmentedControlTextActive,
                  ]}
                >
                  Monthly until stopped
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.segmentedControlOption,
                  repeatMode === "one-time" && styles.segmentedControlOptionActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onRepeatModeChange("one-time")}
              >
                <Text
                  style={[
                    styles.segmentedControlText,
                    repeatMode === "one-time" && styles.segmentedControlTextActive,
                  ]}
                >
                  One-time
                </Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                style={({ pressed }) => [
                  styles.segmentedControlOption,
                  billType === "fixed" && styles.segmentedControlOptionActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onBillTypeChange("fixed")}
              >
                <Text
                  style={[
                    styles.segmentedControlText,
                    billType === "fixed" && styles.segmentedControlTextActive,
                  ]}
                >
                  Fixed
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.segmentedControlOption,
                  billType === "variable" && styles.segmentedControlOptionActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onBillTypeChange("variable")}
              >
                <Text
                  style={[
                    styles.segmentedControlText,
                    billType === "variable" && styles.segmentedControlTextActive,
                  ]}
                >
                  Variable
                </Text>
              </Pressable>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButtonTight,
                pressed && styles.pressed,
              ]}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>Save Bill</Text>
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
