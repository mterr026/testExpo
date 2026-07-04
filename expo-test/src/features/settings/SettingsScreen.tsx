import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { parseDollarInputToNonNegativeCents } from "@/shared/currency";
import { money } from "@/shared/ui/components";
import { colors, styles } from "@/shared/ui/styles";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { useTutorialScrollView } from "@/features/tutorial/hooks";
import { EnvelopesSettingsSection } from "@/features/budgeting/components/EnvelopesSettingsSection";
import type { Envelope } from "@/database/repositories/types";
import type { EnvelopeSnapshotEntry } from "@/engine";

export function SettingsScreen({
  backupExportError,
  backupExportMessage,
  balanceCents,
  reserveCents,
  envelopes,
  envelopeEntries,
  envelopesEnabled,
  envelopeToggleError,
  isBackupExporting,
  isEnvelopesToggleSaving,
  isNotificationSaving,
  notificationError,
  notificationsEnabled,
  onAddEnvelope,
  onBackupExport,
  onBalanceChange,
  onEditEnvelope,
  onEnvelopesToggle,
  onNotificationsToggle,
  onReserveChange,
  isSettingsReady,
  moneyInputAccessoryId,
  afterContent,
}: {
  backupExportError: string;
  backupExportMessage: string;
  balanceCents: number;
  reserveCents: number;
  envelopes: Envelope[];
  envelopeEntries: EnvelopeSnapshotEntry[];
  envelopesEnabled: boolean | null;
  envelopeToggleError: string;
  isBackupExporting: boolean;
  isEnvelopesToggleSaving: boolean;
  isNotificationSaving: boolean;
  isSettingsReady: boolean;
  notificationError: string;
  notificationsEnabled: boolean | null;
  onAddEnvelope: () => void;
  onBackupExport: () => void | Promise<void>;
  onBalanceChange: (value: number) => void | Promise<void>;
  onEditEnvelope: (envelope: Envelope) => void;
  onEnvelopesToggle: () => void | Promise<void>;
  onNotificationsToggle: () => void | Promise<void>;
  onReserveChange: (value: number) => void | Promise<void>;
  moneyInputAccessoryId: string;
  afterContent?: ReactNode;
}) {
  const [balanceDraft, setBalanceDraft] = useState((balanceCents / 100).toFixed(2));
  const [reserveDraft, setReserveDraft] = useState((reserveCents / 100).toFixed(2));
  const [settingsError, setSettingsError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { onTutorialScroll, tutorialScrollRef } = useTutorialScrollView("Settings");

  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    setBalanceDraft((balanceCents / 100).toFixed(2));
    setReserveDraft((reserveCents / 100).toFixed(2));
  }, [balanceCents, isSettingsReady, reserveCents]);

  async function applySettings() {
    if (!isSettingsReady) {
      setSettingsError("Wait for your dashboard to finish loading, then try again.");
      return;
    }

    const nextBalanceCents = parseDollarInputToNonNegativeCents(balanceDraft);
    const nextReserveCents = parseDollarInputToNonNegativeCents(reserveDraft);

    if (nextBalanceCents === null) {
      setSettingsError("Use a valid dollar amount for current balance.");
      return;
    }

    if (nextReserveCents === null) {
      setSettingsError("Use a valid dollar amount for reserve.");
      return;
    }

    try {
      setIsSaving(true);
      await onBalanceChange(nextBalanceCents);
      await onReserveChange(nextReserveCents);
      setBalanceDraft((nextBalanceCents / 100).toFixed(2));
      setReserveDraft((nextReserveCents / 100).toFixed(2));
      setSettingsError("");
    } catch {
      setSettingsError("Settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      ref={tutorialScrollRef}
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={onTutorialScroll}
    >
      <View style={styles.screenHeaderRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Text style={styles.helpText}>
            Reconcile your current balance and essential reserve with your bank.
          </Text>
        </View>
      </View>

      <View style={styles.settingsMoneyCard}>
        <Text style={styles.settingsGroupTitle}>Money</Text>
        <View style={styles.settingsMetricRow}>
          <View style={styles.settingsMetric}>
            <Text style={styles.settingsMetricLabel}>Current balance</Text>
            <Text style={styles.settingsMetricValue}>{money(balanceCents)}</Text>
          </View>
          <View style={styles.settingsMetric}>
            <Text style={styles.settingsMetricLabel}>Current reserve</Text>
            <Text style={styles.settingsMetricValue}>{money(reserveCents)}</Text>
          </View>
        </View>

        <TutorialTarget id="settings-current-balance">
          <View style={styles.settingsMoneySection}>
            <Text style={styles.inputLabel}>Current balance</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              inputAccessoryViewID={moneyInputAccessoryId}
              value={balanceDraft}
              onChangeText={(text) => {
                setBalanceDraft(text);
                setSettingsError("");
              }}
            />
            <Text style={styles.helpText}>
              Match this to your bank account so safe-to-spend stays accurate.
            </Text>
          </View>
        </TutorialTarget>

        <TutorialTarget id="settings-essential-reserve">
          <View style={styles.settingsMoneySection}>
            <Text style={styles.inputLabel}>Essential reserve</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              inputAccessoryViewID={moneyInputAccessoryId}
              value={reserveDraft}
              onChangeText={(text) => {
                setReserveDraft(text);
                setSettingsError("");
              }}
            />
          </View>
        </TutorialTarget>

        {!!settingsError && <Text style={styles.errorText}>{settingsError}</Text>}

        <Pressable
          disabled={!isSettingsReady || isSaving}
          style={({ pressed }) => [
            styles.primaryButtonCompact,
            styles.settingsSaveButton,
            pressed && styles.pressed,
            (!isSettingsReady || isSaving) && styles.disabledAction,
          ]}
          onPress={applySettings}
        >
          <Text style={styles.primaryButtonText}>
            {!isSettingsReady
              ? "Loading dashboard..."
              : isSaving
                ? "Saving..."
                : "Save money settings"}
          </Text>
        </Pressable>
      </View>

      <TutorialTarget id="settings-preferences">
      <View style={styles.settingsSectionHeader}>
        <Text style={styles.settingsGroupTitle}>Preferences</Text>
      </View>
      <View style={styles.settingsPreferenceGroup}>
        <View style={[styles.settingsPreferenceRow, styles.settingsPreferenceDivider]}>
          <View style={styles.itemCopy}>
            <Text style={styles.itemTitle}>Notifications</Text>
            <Text style={styles.rowMetaText}>Soft reminders for unresolved items</Text>
            {!!notificationError && (
              <Text style={styles.errorText}>{notificationError}</Text>
            )}
          </View>
          <View style={styles.settingsInlineControl}>
            <Text style={styles.settingsValue}>
              {notificationsEnabled == null
                ? "Loading"
                : notificationsEnabled
                  ? "On"
                  : "Off"}
            </Text>
            <Switch
              disabled={notificationsEnabled == null || isNotificationSaving}
              ios_backgroundColor={colors.border}
              thumbColor={colors.card}
              trackColor={{
                false: colors.border,
                true: colors.accent,
              }}
              value={!!notificationsEnabled}
              onValueChange={() => {
                void onNotificationsToggle();
              }}
            />
          </View>
        </View>
        <View style={[styles.settingsPreferenceRow, styles.settingsPreferenceDivider]}>
          <View style={styles.itemCopy}>
            <Text style={styles.itemTitle}>Envelope budgeting</Text>
            <Text style={styles.rowMetaText}>
              Partition Safe to Spend into category envelopes
            </Text>
            {!!envelopeToggleError && (
              <Text style={styles.errorText}>{envelopeToggleError}</Text>
            )}
          </View>
          <View style={styles.settingsInlineControl}>
            <Text style={styles.settingsValue}>
              {envelopesEnabled == null
                ? "Loading"
                : envelopesEnabled
                  ? "On"
                  : "Off"}
            </Text>
            <Switch
              disabled={envelopesEnabled == null || isEnvelopesToggleSaving}
              ios_backgroundColor={colors.border}
              thumbColor={colors.card}
              trackColor={{
                false: colors.border,
                true: colors.accent,
              }}
              value={!!envelopesEnabled}
              onValueChange={() => {
                void onEnvelopesToggle();
              }}
            />
          </View>
        </View>
        <View style={styles.settingsPreferenceRow}>
          <View style={styles.itemCopy}>
            <Text style={styles.itemTitle}>Backup</Text>
            <Text style={styles.rowMetaText}>Export a local JSON backup</Text>
            {!!backupExportMessage && (
              <Text style={styles.successText}>{backupExportMessage}</Text>
            )}
            {!!backupExportError && (
              <Text style={styles.errorText}>{backupExportError}</Text>
            )}
          </View>
          <Pressable
            disabled={isBackupExporting}
            style={({ pressed }) => [
              styles.settingsActionButton,
              pressed && styles.pressed,
              isBackupExporting && styles.disabledAction,
            ]}
            onPress={() => {
              void onBackupExport();
            }}
          >
            <Text style={styles.settingsActionButtonText}>
              {isBackupExporting ? "Exporting" : "Export"}
            </Text>
          </Pressable>
        </View>
      </View>
      </TutorialTarget>

      <EnvelopesSettingsSection
        envelopes={envelopes}
        envelopeEntries={envelopeEntries}
        envelopesEnabled={!!envelopesEnabled}
        onAddEnvelope={onAddEnvelope}
        onEditEnvelope={onEditEnvelope}
      />

      {afterContent}
    </ScrollView>
  );
}
