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
import type { Bill } from "@/shared/ui/types";

type BillConfirmationModalProps = {
  bill: Bill | null;
  amountDraft: string;
  error: string;
  amountAccessoryId: string;
  onAmountDraftChange: (text: string) => void;
  onSave: () => void | Promise<void>;
  onClose: () => void;
};

export function BillConfirmationModal({
  bill,
  amountDraft,
  error,
  amountAccessoryId,
  onAmountDraftChange,
  onSave,
  onClose,
}: BillConfirmationModalProps) {
  return (
    <Modal visible={!!bill} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss} />
        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>Confirm amount</Text>
          <Text style={styles.helpText}>
            Update the bill amount before it counts as due.
          </Text>

          <Text style={styles.inputLabel}>Bill</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{bill?.name}</Text>
          </View>

          {bill?.dueDate ? (
            <>
              <Text style={styles.inputLabel}>Due date</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {formatBillDisplayDate(bill.dueDate)}
                </Text>
              </View>
            </>
          ) : null}

          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={[styles.input, styles.purchaseInput]}
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputAccessoryViewID={amountAccessoryId}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            value={amountDraft}
            onChangeText={onAmountDraftChange}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButtonTight,
              pressed && styles.pressed,
            ]}
            onPress={onSave}
          >
            <Text style={styles.primaryButtonText}>Save confirmed amount</Text>
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

function formatBillDisplayDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
}

function formatMonth(month: number) {
  return [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][month - 1] ?? "";
}
