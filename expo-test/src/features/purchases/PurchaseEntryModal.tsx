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
import type { Purchase } from "@/shared/ui/types";

type PurchaseEntryModalProps = {
  visible: boolean;
  mode: "add" | "edit";
  name: string;
  amount: string;
  date: string;
  status: Purchase["status"];
  error: string;
  amountAccessoryId: string;
  onNameChange: (text: string) => void;
  onAmountChange: (text: string) => void;
  onDateChange: (date: string) => void;
  onStatusChange: (status: Purchase["status"]) => void;
  onSave: () => void | Promise<void>;
  onClose: () => void;
};

export function PurchaseEntryModal({
  visible,
  mode,
  name,
  amount,
  date,
  status,
  error,
  amountAccessoryId,
  onNameChange,
  onAmountChange,
  onDateChange,
  onStatusChange,
  onSave,
  onClose,
}: PurchaseEntryModalProps) {
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
            {isEditing ? "Edit Purchase" : "Record Purchase"}
          </Text>
          <Text style={styles.helpText}>
            Record spending to keep Safe to Spend accurate.
          </Text>

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.purchaseInput]}
            placeholder="Purchase description"
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
            label="Date"
            value={date}
            onChange={onDateChange}
          />

          <Text style={styles.inputLabel}>Status</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              style={({ pressed }) => [
                styles.segmentedControlOption,
                status === "Pending" && styles.segmentedControlOptionActive,
                pressed && styles.pressed,
              ]}
              onPress={() => onStatusChange("Pending")}
            >
              <Text
                style={[
                  styles.segmentedControlText,
                  status === "Pending" && styles.segmentedControlTextActive,
                ]}
              >
                Pending
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.segmentedControlOption,
                status === "Charged" && styles.segmentedControlOptionActive,
                pressed && styles.pressed,
              ]}
              onPress={() => onStatusChange("Charged")}
            >
              <Text
                style={[
                  styles.segmentedControlText,
                  status === "Charged" && styles.segmentedControlTextActive,
                ]}
              >
                Charged
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
              Save Purchase
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
