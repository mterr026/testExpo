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

import {
  DatePickerField,
  KeyboardDoneAccessory,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { ImportSuggestionKind } from "@/database/repositories/types";
import type { PaycheckIncomeRole, PaycheckRecurrence } from "@/shared/ui/types";

export type ImportSuggestionConfirmFormProps = {
  amount: string;
  amountAccessoryId: string;
  backLabel?: string;
  dueDate: string;
  error: string;
  incomeRole: PaycheckIncomeRole;
  isSaving: boolean;
  name: string;
  recurrence: PaycheckRecurrence;
  suggestionKind: ImportSuggestionKind;
  onAmountChange: (text: string) => void;
  onClose: () => void;
  onDueDateChange: (text: string) => void;
  onIncomeRoleChange: (role: PaycheckIncomeRole) => void;
  onNameChange: (text: string) => void;
  onRecurrenceChange: (recurrence: PaycheckRecurrence) => void;
  onReject: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
};

type ImportSuggestionConfirmModalProps = ImportSuggestionConfirmFormProps & {
  visible: boolean;
};

export function ImportSuggestionConfirmForm({
  amount,
  amountAccessoryId,
  backLabel = "Review Later",
  dueDate,
  error,
  incomeRole,
  isSaving,
  name,
  recurrence,
  suggestionKind,
  onAmountChange,
  onClose,
  onDueDateChange,
  onIncomeRoleChange,
  onNameChange,
  onRecurrenceChange,
  onReject,
  onSave,
}: ImportSuggestionConfirmFormProps) {
  const isIncome = suggestionKind === "income";

  return (
    <>
      <Text style={styles.sectionTitle}>
        {isIncome ? "Recommended Income Found" : "Confirm bill"}
      </Text>
      <Text style={styles.helpText}>
        {isIncome
          ? "Review the imported income before creating an expected paycheck."
          : "Review the imported suggestion before adding it to bills."}
      </Text>

      <Text style={styles.inputLabel}>{isIncome ? "Source" : "Name"}</Text>
      <TextInput
        style={[styles.input, styles.purchaseInput]}
        placeholder={isIncome ? "Income source" : "Bill name"}
        returnKeyType="done"
        value={name}
        onChangeText={onNameChange}
        onSubmitEditing={Keyboard.dismiss}
      />

      <Text style={styles.inputLabel}>Amount</Text>
      <TextInput
        style={[styles.input, styles.purchaseInput]}
        placeholder="0.00"
        keyboardType="decimal-pad"
        inputAccessoryViewID={amountAccessoryId}
        returnKeyType="done"
        value={amount}
        onChangeText={onAmountChange}
        onSubmitEditing={Keyboard.dismiss}
      />

      <DatePickerField
        label={isIncome ? "Pay date" : "Due date"}
        value={dueDate}
        onChange={onDueDateChange}
      />

      {isIncome && (
        <>
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
        </>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        disabled={isSaving}
        style={({ pressed }) => [
          styles.primaryButtonTight,
          pressed && styles.pressed,
        ]}
        onPress={onSave}
      >
        <Text style={styles.primaryButtonText}>
          {isSaving
            ? "Saving..."
            : isIncome
              ? "Confirm Income"
              : "Add To Bills"}
        </Text>
      </Pressable>

      {isIncome && (
        <Pressable
          disabled={isSaving}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
          onPress={onReject}
        >
          <Text style={styles.secondaryButtonText}>Ignore</Text>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && styles.pressed,
        ]}
        onPress={onClose}
      >
        <Text style={styles.cancelButtonText}>{backLabel}</Text>
      </Pressable>
    </>
  );
}

export function ImportSuggestionConfirmModal({
  visible,
  ...formProps
}: ImportSuggestionConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss} />
        <View style={styles.sheet}>
          <ImportSuggestionConfirmForm {...formProps} />
          <KeyboardDoneAccessory nativeID={formProps.amountAccessoryId} />
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
  { label: "Monthly", value: "monthly" },
];
