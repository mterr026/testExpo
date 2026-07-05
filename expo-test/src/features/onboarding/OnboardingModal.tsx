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

import type { ImportSuggestion } from "@/database/repositories/types";
import {
  ImportSuggestionConfirmForm,
  type ImportSuggestionConfirmFormProps,
} from "@/features/import/ImportSuggestionConfirmModal";
import { ImportReviewSection } from "@/features/import/ImportReviewSection";
import type { ImportPhase } from "@/features/import/importLoadingStatus";
import {
  KeyboardDoneAccessory,
} from "@/shared/ui/components";
import { useStyles } from "@/shared/ui/ThemeContext";

export type OnboardingStep = "balance" | "reserve" | "import";

type OnboardingImportReviewProps = {
  error: string;
  importMessage: string;
  isClearing: boolean;
  isImporting: boolean;
  importPhase: ImportPhase | null;
  isLoading: boolean;
  onClearSuggestions: () => void | Promise<void>;
  onImportFile: () => void | Promise<void>;
  onConfirmSuggestion: (suggestion: ImportSuggestion) => void;
  suggestions: ImportSuggestion[];
  onRejectAllSuggestions: () => void | Promise<void>;
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
  error: string;
  isSaving: boolean;
  amountAccessoryId: string;
  importReview: OnboardingImportReviewProps;
  confirmSuggestion: OnboardingConfirmSuggestionProps;
  onBalanceAmountChange: (text: string) => void;
  onReserveAmountChange: (text: string) => void;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
  onDismiss?: () => void;
};

export function OnboardingModal({
  visible,
  step,
  balanceAmount,
  reserveAmount,
  error,
  isSaving,
  amountAccessoryId,
  importReview,
  confirmSuggestion,
  onBalanceAmountChange,
  onReserveAmountChange,
  onContinue,
  onSkip,
  onDismiss,
}: OnboardingModalProps) {
  const styles = useStyles();
  const isBalanceStep = step === "balance";
  const isImportStep = step === "import";
  const isReserveStep = step === "reserve";
  const isImportConfirmStep =
    isImportStep && confirmSuggestion.visible;
  const wasVisibleRef = useRef(visible);

  useEffect(() => {
    if (wasVisibleRef.current && !visible) {
      onDismiss?.();
    }

    wasVisibleRef.current = visible;
  }, [onDismiss, visible]);

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
                  Required. Use the balance in your bank app right now. Paychecks
                  on this same day are treated as already included; later paychecks
                  add when you confirm them.
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
                privacyNote="Your statement is scanned once to find bills and paychecks, then deleted from the app. Nothing is uploaded."
                emptyBody="Choose a statement file to scan for paychecks and bills."
                error={importReview.error}
                importMessage={importReview.importMessage}
                isClearing={importReview.isClearing}
                isImporting={importReview.isImporting}
                importPhase={importReview.importPhase}
                isLoading={importReview.isLoading}
                onClearSuggestions={importReview.onClearSuggestions}
                onImportFile={importReview.onImportFile}
                onConfirmSuggestion={importReview.onConfirmSuggestion}
                onRejectAllSuggestions={importReview.onRejectAllSuggestions}
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
