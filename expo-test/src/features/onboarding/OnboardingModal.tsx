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

import type { ImportSuggestion } from "@/database/repositories/types";
import {
  ImportSuggestionConfirmForm,
  type ImportSuggestionConfirmFormProps,
} from "@/features/import/ImportSuggestionConfirmModal";
import { ImportReviewSection } from "@/features/import/ImportReviewSection";
import {
  DatePickerField,
  KeyboardDoneAccessory,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { PaycheckRecurrence } from "@/shared/ui/types";

export type OnboardingStep =
  | "balance"
  | "reserve"
  | "paycheck"
  | "bill"
  | "import";

type OnboardingImportReviewProps = {
  error: string;
  importMessage: string;
  isClearing: boolean;
  isImporting: boolean;
  isLoading: boolean;
  onClearSuggestions: () => void | Promise<void>;
  onImportFile: () => void | Promise<void>;
  onConfirmSuggestion: (suggestion: ImportSuggestion) => void;
  suggestions: ImportSuggestion[];
  onRejectSuggestion: (id: string) => void | Promise<void>;
};

type OnboardingConfirmSuggestionProps = ImportSuggestionConfirmFormProps & {
  visible: boolean;
};

type OnboardingModalProps = {
  visible: boolean;
  step: OnboardingStep;
  balanceAmount: string;
  reserveAmount: string;
  paycheckLabel: string;
  paycheckAmount: string;
  paycheckExpectedDate: string;
  paycheckRecurrence: PaycheckRecurrence;
  billName: string;
  billAmount: string;
  billDueDate: string;
  error: string;
  isSaving: boolean;
  amountAccessoryId: string;
  importReview: OnboardingImportReviewProps;
  confirmSuggestion: OnboardingConfirmSuggestionProps;
  onBalanceAmountChange: (text: string) => void;
  onReserveAmountChange: (text: string) => void;
  onPaycheckLabelChange: (text: string) => void;
  onPaycheckAmountChange: (text: string) => void;
  onPaycheckExpectedDateChange: (text: string) => void;
  onPaycheckRecurrenceChange: (recurrence: PaycheckRecurrence) => void;
  onBillNameChange: (text: string) => void;
  onBillAmountChange: (text: string) => void;
  onBillDueDateChange: (text: string) => void;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
  onDismiss?: () => void;
};

const onboardingPaycheckRecurrenceOptions: {
  label: string;
  value: PaycheckRecurrence;
}[] = [
  { label: "Does not repeat", value: "none" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
];

export function OnboardingModal({
  visible,
  step,
  balanceAmount,
  reserveAmount,
  paycheckLabel,
  paycheckAmount,
  paycheckExpectedDate,
  paycheckRecurrence,
  billName,
  billAmount,
  billDueDate,
  error,
  isSaving,
  amountAccessoryId,
  importReview,
  confirmSuggestion,
  onBalanceAmountChange,
  onReserveAmountChange,
  onPaycheckLabelChange,
  onPaycheckAmountChange,
  onPaycheckExpectedDateChange,
  onPaycheckRecurrenceChange,
  onBillNameChange,
  onBillAmountChange,
  onBillDueDateChange,
  onContinue,
  onSkip,
  onDismiss,
}: OnboardingModalProps) {
  const isBalanceStep = step === "balance";
  const isImportStep = step === "import";
  const isReserveStep = step === "reserve";
  const isPaycheckStep = step === "paycheck";
  const isBillStep = step === "bill";
  const isImportConfirmStep =
    isImportStep && confirmSuggestion.visible;
  const canSkip = !isBalanceStep && !isImportConfirmStep;
  const isBusy =
    isSaving ||
    importReview.isImporting ||
    importReview.isClearing ||
    confirmSuggestion.isSaving;
  const continueLabel = isImportStep
    ? isSaving
      ? "Setting up..."
      : "Finish setup"
    : "Continue";

  return (
    <Modal visible={visible} transparent animationType="slide" onDismiss={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss} />
        <View style={[styles.sheet, isImportStep && styles.onboardingSheetTall]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isBalanceStep && (
              <>
                <Text style={styles.sectionTitle}>
                  What&apos;s your current account balance?
                </Text>
                <Text style={styles.helpText}>
                  Required. This is your one-time starting point — not income.
                  Paychecks and purchases track changes after this.
                </Text>
                <Text style={styles.inputLabel}>Current balance</Text>
                <TextInput
                  style={[styles.input, styles.purchaseInput]}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={amountAccessoryId}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={balanceAmount}
                  onChangeText={onBalanceAmountChange}
                />
              </>
            )}

            {isReserveStep && (
              <>
                <Text style={styles.sectionTitle}>Set your essential reserve</Text>
                <Text style={styles.helpText}>
                  Money held back for essentials. You can change this later in
                  Settings.
                </Text>
                <Text style={styles.inputLabel}>Save reserve</Text>
                <TextInput
                  style={[styles.input, styles.purchaseInput]}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={amountAccessoryId}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={reserveAmount}
                  onChangeText={onReserveAmountChange}
                />
              </>
            )}

            {isPaycheckStep && (
              <>
                <Text style={styles.sectionTitle}>Add your next paycheck</Text>
                <Text style={styles.helpText}>
                  Optional. You can add or edit paychecks later from the Paychecks
                  tab.
                </Text>
                <Text style={styles.inputLabel}>Source</Text>
                <TextInput
                  style={[styles.input, styles.purchaseInput]}
                  placeholder="Main job, side work..."
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={paycheckLabel}
                  onChangeText={onPaycheckLabelChange}
                />
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={[styles.input, styles.purchaseInput]}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={amountAccessoryId}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={paycheckAmount}
                  onChangeText={onPaycheckAmountChange}
                />
                <DatePickerField
                  label="Pay date"
                  value={paycheckExpectedDate}
                  onChange={onPaycheckExpectedDateChange}
                />
                <Text style={styles.inputLabel}>Repeats</Text>
                <View style={styles.paycheckRecurrenceChipRow}>
                  {onboardingPaycheckRecurrenceOptions.map((option) => {
                    const isSelected = paycheckRecurrence === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        style={({ pressed }) => [
                          styles.filterChip,
                          isSelected && styles.filterChipActive,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => onPaycheckRecurrenceChange(option.value)}
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

            {isBillStep && (
              <>
                <Text style={styles.sectionTitle}>Add a recurring bill</Text>
                <Text style={styles.helpText}>
                  Optional. You can add or edit bills later from the Bills tab.
                </Text>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={[styles.input, styles.purchaseInput]}
                  placeholder="Rent, electric, phone..."
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={billName}
                  onChangeText={onBillNameChange}
                />
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={[styles.input, styles.purchaseInput]}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={amountAccessoryId}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={billAmount}
                  onChangeText={onBillAmountChange}
                />
                <DatePickerField
                  label="Due date"
                  value={billDueDate}
                  onChange={onBillDueDateChange}
                />
              </>
            )}

            {isImportStep && isImportConfirmStep && (
              <ImportSuggestionConfirmForm
                {...confirmSuggestion}
                backLabel="Back to import list"
              />
            )}

            {isImportStep && !isImportConfirmStep && (
              <ImportReviewSection
                title="Import a statement"
                helpText="Optional. Choose a CSV or PDF bank statement, then confirm each detected paycheck and bill — check the amount, date, and whether it repeats weekly, biweekly, or monthly. Finish setup once all suggestions are reviewed or ignored."
                emptyBody="Choose a statement file to scan for paychecks and bills."
                error={importReview.error}
                importMessage={importReview.importMessage}
                isClearing={importReview.isClearing}
                isImporting={importReview.isImporting}
                isLoading={importReview.isLoading}
                onClearSuggestions={importReview.onClearSuggestions}
                onImportFile={importReview.onImportFile}
                onConfirmSuggestion={importReview.onConfirmSuggestion}
                suggestions={importReview.suggestions}
                onRejectSuggestion={importReview.onRejectSuggestion}
              />
            )}

            {!!error && !isImportConfirmStep && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {!isImportConfirmStep && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButtonTight,
                  pressed && styles.pressed,
                ]}
                disabled={isBusy}
                onPress={onContinue}
              >
                <Text style={styles.primaryButtonText}>{continueLabel}</Text>
              </Pressable>
            )}

            {canSkip && (
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
                disabled={isBusy}
                onPress={onSkip}
              >
                <Text style={styles.cancelButtonText}>Skip for now</Text>
              </Pressable>
            )}
          </ScrollView>
          <KeyboardDoneAccessory
            nativeID={
              isImportConfirmStep
                ? confirmSuggestion.amountAccessoryId
                : amountAccessoryId
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
