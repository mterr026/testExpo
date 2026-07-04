import { Pressable, Text, View } from "react-native";

import type { Envelope } from "@/database/repositories/types";
import type { EnvelopeSnapshotEntry } from "@/engine";
import { money } from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";

type EnvelopesSettingsSectionProps = {
  envelopes: Envelope[];
  envelopeEntries: EnvelopeSnapshotEntry[];
  envelopesEnabled: boolean;
  onAddEnvelope: () => void;
  onEditEnvelope: (envelope: Envelope) => void;
};

export function EnvelopesSettingsSection({
  envelopes,
  envelopeEntries,
  envelopesEnabled,
  onAddEnvelope,
  onEditEnvelope,
}: EnvelopesSettingsSectionProps) {
  if (!envelopesEnabled) {
    return null;
  }

  const entryByEnvelopeId = new Map(
    envelopeEntries.map((entry) => [entry.envelopeId, entry])
  );

  return (
    <View style={styles.settingsSectionHeader}>
      <View style={styles.screenHeaderRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.settingsGroupTitle}>Envelopes</Text>
          <Text style={styles.helpText}>
            Allocations refill each paycheck cycle. Unused balance does not
            exceed the set amount.
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.settingsActionButton,
            pressed && styles.pressed,
          ]}
          onPress={onAddEnvelope}
        >
          <Text style={styles.settingsActionButtonText}>Add</Text>
        </Pressable>
      </View>

      {envelopes.length === 0 ? (
        <View style={styles.comingUpCard}>
          <Text style={[styles.rowMetaText, styles.timelineEmptyText]}>
            Add envelopes like Gas or Groceries to partition Safe to Spend.
          </Text>
        </View>
      ) : (
        <View style={styles.transactionListGroup}>
          {envelopes.map((envelope) => {
            const entry = entryByEnvelopeId.get(envelope.id);
            const remainingCents = entry?.remainingCents ?? envelope.allocationCents;
            const spentCents = entry?.spentCents ?? 0;

            return (
              <Pressable
                key={envelope.id}
                style={({ pressed }) => [
                  styles.purchaseTransactionRow,
                  pressed && styles.pressed,
                ]}
                onPress={() => onEditEnvelope(envelope)}
              >
                <View style={styles.itemCopy}>
                  <Text style={styles.transactionTitle}>
                    {envelope.name}
                    {envelope.isPaused ? " (Paused)" : ""}
                  </Text>
                  <Text style={styles.rowMetaText}>
                    {money(spentCents)} spent of {money(envelope.allocationCents)}
                  </Text>
                </View>
                <Text style={styles.transactionAmount}>
                  {money(remainingCents)} left
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
