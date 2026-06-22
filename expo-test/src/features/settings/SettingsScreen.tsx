import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { parseDollarInputToNonNegativeCents } from "@/shared/currency";
import { money } from "@/shared/ui/components";
import { colors, styles } from "@/shared/ui/styles";

export function SettingsScreen({
  backupExportError,
  backupExportMessage,
  reserveCents,
  isBackupExporting,
  isNotificationSaving,
  notificationError,
  notificationsEnabled,
  onBackupExport,
  onNotificationsToggle,
  onReserveChange,
  isSettingsReady,
  moneyInputAccessoryId,
  afterContent,
}: {
  backupExportError: string;
  backupExportMessage: string;
  reserveCents: number;
  isBackupExporting: boolean;
  isNotificationSaving: boolean;
  isSettingsReady: boolean;
  notificationError: string;
  notificationsEnabled: boolean | null;
  onBackupExport: () => void | Promise<void>;
  onNotificationsToggle: () => void | Promise<void>;
  onReserveChange: (value: number) => void | Promise<void>;
  moneyInputAccessoryId: string;
  afterContent?: ReactNode;
}) {
  const [reserveDraft, setReserveDraft] = useState((reserveCents / 100).toFixed(2));
  const [settingsError, setSettingsError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    setReserveDraft((reserveCents / 100).toFixed(2));
  }, [isSettingsReady, reserveCents]);

  async function applySettings() {
    if (!isSettingsReady) {
      setSettingsError("Wait for your dashboard to finish loading, then try again.");
      return;
    }

    const nextReserveCents = parseDollarInputToNonNegativeCents(reserveDraft);

    if (nextReserveCents === null) {
      setSettingsError("Use a valid dollar amount for reserve.");
      return;
    }

    try {
      setIsSaving(true);
      await onReserveChange(nextReserveCents);
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
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.screenHeaderRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Text style={styles.helpText}>
            Adjust your essential reserve and app preferences.
          </Text>
        </View>
      </View>

      <View style={styles.settingsMoneyCard}>
        <Text style={styles.settingsGroupTitle}>Money</Text>
        <View style={styles.settingsMetricRow}>
          <View style={styles.settingsMetric}>
            <Text style={styles.settingsMetricLabel}>Current reserve</Text>
            <Text style={styles.settingsMetricValue}>{money(reserveCents)}</Text>
          </View>
        </View>

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
                : "Save reserve"}
          </Text>
        </Pressable>
      </View>

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

      {afterContent}
    </ScrollView>
  );
}
