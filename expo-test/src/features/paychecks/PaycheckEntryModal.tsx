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

import {
  DatePickerField,
  KeyboardDoneAccessory,
} from "@/shared/ui/components";
import { hapticConfirm } from "@/shared/ui/haptics";
import { SheetDragHandle } from "@/shared/ui/SheetDragHandle";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { PaycheckIncomeRole, PaycheckRecurrence } from "@/shared/ui/types";

type PaycheckEntryModalProps = {
  visible: boolean;
  mode: "add" | "edit";
  label: string;
  amount: string;
  expectedDate: string;
  incomeRole: PaycheckIncomeRole;
  recurrence: PaycheckRecurrence;
  error: string;
  amountAccessoryId: string;
  onLabelChange: (text: string) => void;
  onAmountChange: (text: string) => void;
  onExpectedDateChange: (text: string) => void;
  onIncomeRoleChange: (role: PaycheckIncomeRole) => void;
  onRecurrenceChange: (recurrence: PaycheckRecurrence) => void;
  onSave: () => void | Promise<void>;
  onClose: () => void;
};

export function PaycheckEntryModal({
  visible,
  mode,
  label,
  amount,
  expectedDate,
  incomeRole,
  recurrence,
  error,
  amountAccessoryId,
  onLabelChange,
  onAmountChange,
  onExpectedDateChange,
  onIncomeRoleChange,
  onRecurrenceChange,
  onSave,
  onClose,
}: PaycheckEntryModalProps) {
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
              {isEditing ? "Edit Income" : "Record Income"}
            </Text>
            <Text style={styles.helpText}>
              {isEditing
                ? "Update income details to keep pay cycles accurate."
                : "Enter the amount first — source label is optional."}
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

            <Text style={styles.inputLabel}>Source (optional)</Text>
            <TextInput
              style={[styles.input, styles.purchaseInput]}
              placeholder="Main job, side work..."
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              value={label}
              onChangeText={onLabelChange}
            />

            <DatePickerField
              label="Pay date"
              value={expectedDate}
              onChange={onExpectedDateChange}
            />

            <Text style={styles.inputLabel}>Income type</Text>
            <View style={styles.paycheckRecurrenceChipRow}>
              {paycheckIncomeRoleOptions.map((option) => {
                const isSelected = incomeRole === option.value;

                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isSelected && styles.filterChipActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onIncomeRoleChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Repeats</Text>
            <View style={styles.paycheckRecurrenceChipRow}>
              {paycheckRecurrenceOptions.map((option) => {
                const isSelected = recurrence === option.value;

                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isSelected && styles.filterChipActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onRecurrenceChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButtonTight,
                pressed && styles.pressed,
              ]}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>Save Income</Text>
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

const paycheckIncomeRoleOptions: {
  label: string;
  value: PaycheckIncomeRole;
}[] = [
  { label: "Primary income", value: "primary" },
  { label: "Secondary (pension, disability)", value: "secondary" },
];

const paycheckRecurrenceOptions: {
  label: string;
  value: PaycheckRecurrence;
}[] = [
  { label: "Does not repeat", value: "none" },
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Semimonthly", value: "semimonthly" },
  { label: "Monthly", value: "monthly" },
];
