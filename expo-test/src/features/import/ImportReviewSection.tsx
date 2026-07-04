import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { ImportSuggestion } from "@/database/repositories/types";
import {
  ActionMenu,
  EmptyState,
  money,
  OverflowButton,
  StatusPill,
  type ActionMenuHeader,
  type ActionMenuItem,
} from "@/shared/ui/components";
import {
  getImportSuggestionMenuPresentation,
  getImportSuggestionRowPresentation,
} from "@/shared/ui/statusBadges";
import { styles } from "@/shared/ui/styles";

import { ImportLoadingIndicator } from "./components/ImportLoadingIndicator";
import {
  getImportLoadingLabel,
  type ImportPhase,
} from "./importLoadingStatus";

export function ImportReviewSection({
  error,
  helpText = "We found income and bills from your statement. Confirm what should become part of your Budget Flow.",
  importMessage,
  isClearing,
  isImporting,
  importPhase,
  isLoading,
  onClearSuggestions,
  onImportFile,
  onConfirmSuggestion,
  suggestions,
  onRejectAllSuggestions,
  onRejectSuggestion,
  privacyNote,
  title = "Review Your Starting Budget",
  emptyBody = "Income and bills found from an imported statement will appear here.",
}: {
  error: string;
  helpText?: string;
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
  privacyNote?: string;
  title?: string;
  emptyBody?: string;
}) {
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<ImportSuggestion | null>(null);

  const suggestionActions: ActionMenuItem[] = selectedSuggestion
    ? [
        {
          icon: "↓",
          label: "Confirm as Bill",
          closeBeforeAction: true,
          onPress: () =>
            onConfirmSuggestion({
              ...selectedSuggestion,
              suggestionKind: "bill",
            }),
        },
        {
          icon: "↑",
          label: "Confirm as Paycheck",
          closeBeforeAction: true,
          onPress: () =>
            onConfirmSuggestion({
              ...selectedSuggestion,
              suggestionKind: "income",
            }),
        },
        {
          icon: "×",
          label: "Ignore",
          destructive: true,
          onPress: () => onRejectSuggestion(selectedSuggestion.id),
        },
      ]
    : [];

  const importLoadingLabel = importPhase
    ? getImportLoadingLabel(importPhase)
    : null;

  return (
    <View>
      <View style={styles.importReviewPanel}>
        <Text style={styles.importReviewTitle}>{title}</Text>
        <Text style={styles.helpText}>{helpText}</Text>
        {!!privacyNote && (
          <Text style={styles.importPrivacyNote}>{privacyNote}</Text>
        )}
        <View style={styles.importReviewActions}>
          {suggestions.length > 0 && (
            <>
              <Pressable
                disabled={isClearing || isImporting}
                style={({ pressed }) => [
                  styles.inlineSecondaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={onRejectAllSuggestions}
              >
                <Text style={styles.inlineSecondaryButtonText}>
                  {isClearing ? "Dismissing..." : "Dismiss all"}
                </Text>
              </Pressable>
              <Pressable
                disabled={isClearing || isImporting}
                style={({ pressed }) => [
                  styles.inlineSecondaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={onClearSuggestions}
              >
                <Text style={styles.inlineSecondaryButtonText}>
                  {isClearing ? "Clearing" : "Clear"}
                </Text>
              </Pressable>
            </>
          )}
          <Pressable
            disabled={isClearing || isImporting}
            style={({ pressed }) => [
              styles.inlinePrimaryButton,
              pressed && styles.pressed,
            ]}
            onPress={onImportFile}
          >
            <Text style={styles.inlinePrimaryButtonText}>
              {isImporting ? "Importing..." : "Import File"}
            </Text>
          </Pressable>
        </View>
      </View>

      {!!importMessage && !error && !isImporting && (
        <Text style={styles.importReviewMessage}>{importMessage}</Text>
      )}

      {isImporting && importLoadingLabel && (
        <ImportLoadingIndicator
          subtitle={importLoadingLabel.subtitle}
          title={importLoadingLabel.title}
        />
      )}

      {isLoading && !isImporting && (
        <ImportLoadingIndicator
          subtitle="Checking for saved statement suggestions."
          title="Loading import suggestions..."
        />
      )}

      {!isLoading && !isImporting && !!error && (
        <View style={styles.importStatusCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && !isImporting && !error && suggestions.length === 0 && (
        <EmptyState
          title="No import suggestions"
          body={emptyBody}
        />
      )}

      {!isLoading && !isImporting && !error && suggestions.length > 0 && (
        <>
          {groupImportSuggestions(suggestions).map((group) => (
            <View key={group.title}>
              <Text style={styles.importGroupHeader}>{group.title}</Text>
              <View style={styles.importSuggestionListGroup}>
                {group.suggestions.map((suggestion, index) => (
                  <ImportSuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                    showDivider={index < group.suggestions.length - 1}
                    onOpenActions={setSelectedSuggestion}
                  />
                ))}
              </View>
            </View>
          ))}
        </>
      )}

      <ActionMenu
        header={
          selectedSuggestion
            ? getSuggestionActionHeader(selectedSuggestion)
            : undefined
        }
        title={selectedSuggestion?.suggestedName ?? "Import suggestion"}
        visible={!!selectedSuggestion}
        actions={suggestionActions}
        onClose={() => setSelectedSuggestion(null)}
      />
    </View>
  );
}

function getSuggestionActionHeader(suggestion: ImportSuggestion): ActionMenuHeader {
  const status = getImportSuggestionMenuPresentation(suggestion);

  return {
    amount: formatSuggestionAmount(suggestion),
    meta: `${formatInterval(suggestion.detectedInterval)} • ${formatSuggestionDateLabel(
      suggestion
    )} • ${suggestion.occurrenceCount} matches`,
    status: status.label,
    statusTone: status.tone,
    title: suggestion.suggestedName,
  };
}

function ImportSuggestionRow({
  suggestion,
  showDivider,
  onOpenActions,
}: {
  suggestion: ImportSuggestion;
  showDivider: boolean;
  onOpenActions: (suggestion: ImportSuggestion) => void;
}) {
  const kindLabel = getImportSuggestionRowPresentation(suggestion);
  const isIncome = suggestion.suggestionKind === "income";

  return (
    <View
      style={[
        styles.importSuggestionRow,
        showDivider && styles.importSuggestionRowDivider,
      ]}
    >
      <View style={styles.itemCopy}>
        <View style={styles.importSuggestionTitleRow}>
          <Text style={styles.transactionTitle}>{suggestion.suggestedName}</Text>
          <StatusPill label={kindLabel.label} tone={kindLabel.tone} />
        </View>
        <Text style={styles.importSuggestionMeta}>
          {formatInterval(suggestion.detectedInterval)} •{" "}
          {formatSuggestionDateLabel(suggestion)}
        </Text>
        <Text style={styles.rowMetaText}>
          {suggestion.occurrenceCount === 1
            ? "Found once on the statement"
            : `${suggestion.occurrenceCount} matching statement dates`}
        </Text>
      </View>
      <View style={styles.importSuggestionAmountColumn}>
        <Text
          style={[
            styles.importSuggestionAmount,
            isIncome && styles.importIncomeAmount,
          ]}
        >
          {formatSuggestionAmount(suggestion)}
        </Text>
        <OverflowButton onPress={() => onOpenActions(suggestion)} />
      </View>
    </View>
  );
}

function groupImportSuggestions(suggestions: ImportSuggestion[]) {
  const groups: {
    title: string;
    suggestions: ImportSuggestion[];
  }[] = [
    { title: "Likely paychecks", suggestions: [] },
    { title: "Likely bills", suggestions: [] },
    { title: "Possible matches", suggestions: [] },
  ];

  for (const suggestion of suggestions) {
    if (suggestion.suggestionKind === "income") {
      groups[0].suggestions.push(suggestion);
      continue;
    }

    if (
      suggestion.suggestionKind === "bill" &&
      suggestion.occurrenceCount > 1 &&
      suggestion.detectedInterval !== "irregular"
    ) {
      groups[1].suggestions.push(suggestion);
      continue;
    }

    groups[2].suggestions.push(suggestion);
  }

  return groups.filter((group) => group.suggestions.length > 0);
}

function formatInterval(interval: ImportSuggestion["detectedInterval"]) {
  switch (interval) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Biweekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "irregular":
      return "Irregular";
  }
}

function formatSuggestionAmount(suggestion: ImportSuggestion) {
  const amount = money(suggestion.suggestedAmountCents);

  return suggestion.suggestionKind === "income" ? `+${amount}` : `-${amount}`;
}

function formatSuggestionDateLabel(suggestion: ImportSuggestion) {
  const formattedDate = formatSuggestionDate(suggestion.suggestedDate);

  if (suggestion.suggestionKind === "income") {
    return formattedDate ? `Pay date ${formattedDate}` : "Pay date not found";
  }

  return formattedDate ? `Due ${formattedDate}` : "Due date not found";
}

function formatSuggestionDate(date: string | null) {
  if (!date) {
    return null;
  }

  const [yearText, monthText, dayText] = date.split("-");
  const dateValue = new Date(
    Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText))
  );

  if (Number.isNaN(dateValue.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateValue);
}
