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
import { EnvelopePickerField } from "@/features/budgeting/components/EnvelopePickerField";
import { hapticConfirm } from "@/shared/ui/haptics";
import { SheetDragHandle } from "@/shared/ui/SheetDragHandle";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { Purchase } from "@/shared/ui/types";

type EnvelopePickerOption = {
  id: string;
  name: string;
};

type PurchaseEntryModalProps = {
  visible: boolean;
  mode: "add" | "edit";
  name: string;
  amount: string;
  date: string;
  status: Purchase["status"];
  error: string;
  amountAccessoryId: string;
  addFormResetKey: number;
  recentDescriptions: string[];
  envelopesEnabled: boolean;
  envelopes: EnvelopePickerOption[];
  envelopeId: string | null;
  onNameChange: (text: string) => void;
  onAmountChange: (text: string) => void;
  onDateChange: (date: string) => void;
  onStatusChange: (status: Purchase["status"]) => void;
  onEnvelopeChange: (envelopeId: string | null) => void;
  onSave: () => void | Promise<void>;
  onSaveAndAddAnother: () => void | Promise<void>;
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
  addFormResetKey,
  recentDescriptions,
  envelopesEnabled,
  envelopes,
  envelopeId,
  onNameChange,
  onAmountChange,
  onDateChange,
  onStatusChange,
  onEnvelopeChange,
  onSave,
  onSaveAndAddAnother,
  onClose,
}: PurchaseEntryModalProps) {
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
  }, [visible, isEditing, addFormResetKey]);

  async function handleSave() {
    void hapticConfirm();
    await onSave();
  }

  async function handleSaveAndAddAnother() {
    void hapticConfirm();
    await onSaveAndAddAnother();
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
              {isEditing ? "Edit Purchase" : "Record Purchase"}
            </Text>
            <Text style={styles.helpText}>
              {isEditing
                ? "Update spending to keep Safe to Spend accurate."
                : "Enter the amount first — description is optional."}
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

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.purchaseInput]}
              placeholder="Coffee, groceries, gas…"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              value={name}
              onChangeText={onNameChange}
            />

            {!isEditing && recentDescriptions.length > 0 && (
              <View style={styles.purchaseRecentMerchantRow}>
                {recentDescriptions.map((description) => (
                  <Pressable
                    key={description}
                    style={({ pressed }) => [
                      styles.filterChip,
                      name === description && styles.filterChipActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onNameChange(description)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        name === description && styles.filterChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <DatePickerField
              label="Date"
              value={date}
              onChange={onDateChange}
            />

            {envelopesEnabled && envelopes.length > 0 && (
              <EnvelopePickerField
                label="Envelope"
                envelopes={envelopes}
                envelopeId={envelopeId}
                onChange={onEnvelopeChange}
              />
            )}

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
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>
                {isEditing ? "Save Changes" : "Save Purchase"}
              </Text>
            </Pressable>

            {!isEditing && (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleSaveAndAddAnother}
              >
                <Text style={styles.secondaryButtonText}>Save & add another</Text>
              </Pressable>
            )}

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
