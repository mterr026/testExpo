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

import type { BillType } from "@/database/repositories/types";
import {
  DatePickerField,
  KeyboardDoneAccessory,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
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
            {isEditing ? "Edit Bill" : "Record Bill"}
          </Text>
          <Text style={styles.helpText}>
            Record upcoming bills to keep Safe to Spend accurate.
          </Text>

          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={[styles.input, styles.purchaseInput]}
            placeholder="Rent, electric, phone..."
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            value={name}
            onChangeText={onNameChange}
          />

          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={[styles.input, styles.purchaseInput]}
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputAccessoryViewID={amountAccessoryId}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            value={amount}
            onChangeText={onAmountChange}
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
            onPress={onSave}
          >
            <Text style={styles.primaryButtonText}>
              Save Bill
            </Text>
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
