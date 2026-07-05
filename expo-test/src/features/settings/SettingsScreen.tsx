import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { parseDollarInputToNonNegativeCents } from "@/shared/currency";
import { money } from "@/shared/ui/components";
import { ScreenSectionTitle } from "@/shared/ui/ScreenSectionTitle";
import { ScreenShell } from "@/shared/ui/ScreenShell";
import { colors, styles } from "@/shared/ui/styles";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { useTutorialScrollView } from "@/features/tutorial/hooks";

const MONEY_AUTOSAVE_DEBOUNCE_MS = 600;
const SAVE_NOTICE_DURATION_MS = 2500;

function isIncompleteMoneyDraft(text: string): boolean {
  return text.trimEnd().endsWith(".");
}

export function SettingsScreen({
  backupExportError,
  backupExportMessage,
  balanceCents,
  reserveCents,
  envelopesEnabled,
  envelopeToggleError,
  isBackupExporting,
  isEnvelopesToggleSaving,
  isNotificationSaving,
  notificationError,
  notificationsEnabled,
  onBackupExport,
  onBalanceChange,
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
  envelopesEnabled: boolean | null;
  envelopeToggleError: string;
  isBackupExporting: boolean;
  isEnvelopesToggleSaving: boolean;
  isNotificationSaving: boolean;
  isSettingsReady: boolean;
  notificationError: string;
  notificationsEnabled: boolean | null;
  onBackupExport: () => void | Promise<void>;
  onBalanceChange: (value: number) => void | Promise<void>;
  onEnvelopesToggle: () => void | Promise<void>;
  onNotificationsToggle: () => void | Promise<void>;
  onReserveChange: (value: number) => void | Promise<void>;
  moneyInputAccessoryId: string;
  afterContent?: ReactNode;
}) {
  const [balanceDraft, setBalanceDraft] = useState((balanceCents / 100).toFixed(2));
  const [reserveDraft, setReserveDraft] = useState((reserveCents / 100).toFixed(2));
  const [settingsError, setSettingsError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const balanceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reserveSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const balanceFocusedRef = useRef(false);
  const reserveFocusedRef = useRef(false);
  const { onTutorialScroll, tutorialScrollRef } = useTutorialScrollView("Settings");

  const showSaveNotice = useCallback((message: string) => {
    if (saveNoticeTimerRef.current) {
      clearTimeout(saveNoticeTimerRef.current);
    }

    setSaveNotice(message);
    saveNoticeTimerRef.current = setTimeout(() => {
      setSaveNotice("");
      saveNoticeTimerRef.current = null;
    }, SAVE_NOTICE_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current) {
        clearTimeout(saveNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSettingsReady || balanceFocusedRef.current) {
      return;
    }

    setBalanceDraft((balanceCents / 100).toFixed(2));
  }, [balanceCents, isSettingsReady]);

  useEffect(() => {
    if (!isSettingsReady || reserveFocusedRef.current) {
      return;
    }

    setReserveDraft((reserveCents / 100).toFixed(2));
  }, [isSettingsReady, reserveCents]);

  const saveBalance = useCallback(
    async (nextBalanceCents: number) => {
      if (!isSettingsReady || nextBalanceCents === balanceCents) {
        return;
      }

      try {
        await onBalanceChange(nextBalanceCents);
        setBalanceDraft((nextBalanceCents / 100).toFixed(2));
        setSettingsError("");
        showSaveNotice("Saved");
      } catch {
        setSettingsError("Current balance could not be saved.");
      }
    },
    [balanceCents, isSettingsReady, onBalanceChange, showSaveNotice]
  );

  const saveReserve = useCallback(
    async (nextReserveCents: number) => {
      if (!isSettingsReady || nextReserveCents === reserveCents) {
        return;
      }

      try {
        await onReserveChange(nextReserveCents);
        setReserveDraft((nextReserveCents / 100).toFixed(2));
        setSettingsError("");
        showSaveNotice("Saved");
      } catch {
        setSettingsError("Essential reserve could not be saved.");
      }
    },
    [isSettingsReady, onReserveChange, reserveCents, showSaveNotice]
  );

  const flushBalanceSave = useCallback(() => {
    if (balanceSaveTimerRef.current) {
      clearTimeout(balanceSaveTimerRef.current);
      balanceSaveTimerRef.current = null;
    }

    if (!isSettingsReady || isIncompleteMoneyDraft(balanceDraft)) {
      return;
    }

    const nextBalanceCents = parseDollarInputToNonNegativeCents(balanceDraft);
    if (nextBalanceCents === null) {
      setSettingsError("Use a valid dollar amount for current balance.");
      return;
    }

    void saveBalance(nextBalanceCents);
  }, [balanceDraft, isSettingsReady, saveBalance]);

  const flushReserveSave = useCallback(() => {
    if (reserveSaveTimerRef.current) {
      clearTimeout(reserveSaveTimerRef.current);
      reserveSaveTimerRef.current = null;
    }

    if (!isSettingsReady || isIncompleteMoneyDraft(reserveDraft)) {
      return;
    }

    const nextReserveCents = parseDollarInputToNonNegativeCents(reserveDraft);
    if (nextReserveCents === null) {
      setSettingsError("Use a valid dollar amount for essential reserve.");
      return;
    }

    void saveReserve(nextReserveCents);
  }, [isSettingsReady, reserveDraft, saveReserve]);

  useEffect(() => {
    if (!isSettingsReady || isIncompleteMoneyDraft(balanceDraft)) {
      return;
    }

    const nextBalanceCents = parseDollarInputToNonNegativeCents(balanceDraft);
    if (nextBalanceCents === null || nextBalanceCents === balanceCents) {
      return;
    }

    balanceSaveTimerRef.current = setTimeout(() => {
      void saveBalance(nextBalanceCents);
    }, MONEY_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (balanceSaveTimerRef.current) {
        clearTimeout(balanceSaveTimerRef.current);
        balanceSaveTimerRef.current = null;
      }
    };
  }, [balanceCents, balanceDraft, isSettingsReady, saveBalance]);

  useEffect(() => {
    if (!isSettingsReady || isIncompleteMoneyDraft(reserveDraft)) {
      return;
    }

    const nextReserveCents = parseDollarInputToNonNegativeCents(reserveDraft);
    if (nextReserveCents === null || nextReserveCents === reserveCents) {
      return;
    }

    reserveSaveTimerRef.current = setTimeout(() => {
      void saveReserve(nextReserveCents);
    }, MONEY_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (reserveSaveTimerRef.current) {
        clearTimeout(reserveSaveTimerRef.current);
        reserveSaveTimerRef.current = null;
      }
    };
  }, [isSettingsReady, reserveCents, reserveDraft, saveReserve]);

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
      <ScreenShell
        subtitle="Reconcile your current balance and essential reserve with your bank."
        title="Settings"
      />

      <ScreenSectionTitle title="Profile & Budget" />

      <View style={styles.settingsMoneyCard}>
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
                setSaveNotice("");
              }}
              onFocus={() => {
                balanceFocusedRef.current = true;
              }}
              onBlur={() => {
                balanceFocusedRef.current = false;
                flushBalanceSave();
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
                setSaveNotice("");
              }}
              onFocus={() => {
                reserveFocusedRef.current = true;
              }}
              onBlur={() => {
                reserveFocusedRef.current = false;
                flushReserveSave();
              }}
            />
          </View>
        </TutorialTarget>

        {!!settingsError && <Text style={styles.errorText}>{settingsError}</Text>}
        {!!saveNotice && <Text style={styles.successText}>{saveNotice}</Text>}
      </View>

      <View style={styles.settingsPreferenceGroup}>
        <View style={styles.settingsPreferenceRow}>
          <View style={styles.itemCopy}>
            <Text style={styles.itemTitle}>Envelope budgeting</Text>
            <Text style={styles.rowMetaText}>
              Partition Safe to Spend into category envelopes on the Dashboard
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
      </View>

      <TutorialTarget id="settings-preferences">
        <ScreenSectionTitle title="Notifications" />
        <View style={styles.settingsPreferenceGroup}>
          <View style={styles.settingsPreferenceRow}>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>Bill reminders</Text>
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
        </View>

        {afterContent ? (
          <>
            <ScreenSectionTitle title="Import" />
            {afterContent}
          </>
        ) : null}

        <ScreenSectionTitle title="About" />
        <View style={styles.settingsPreferenceGroup}>
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
    </ScrollView>
  );
}
