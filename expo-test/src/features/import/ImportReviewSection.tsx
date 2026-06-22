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
  type StatusPillTone,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";

export function ImportReviewSection({
  error,
  helpText = "We found income and bills from your statement. Confirm what should become part of your Budget Flow.",
  importMessage,
  isClearing,
  isImporting,
  isLoading,
  onClearSuggestions,
  onImportFile,
  onConfirmSuggestion,
  suggestions,
  onRejectSuggestion,
  title = "Review Your Starting Budget",
  emptyBody = "Income and bills found from an imported statement will appear here.",
}: {
  error: string;
  helpText?: string;
  importMessage: string;
  isClearing: boolean;
  isImporting: boolean;
  isLoading: boolean;
  onClearSuggestions: () => void | Promise<void>;
  onImportFile: () => void | Promise<void>;
  onConfirmSuggestion: (suggestion: ImportSuggestion) => void;
  suggestions: ImportSuggestion[];
  onRejectSuggestion: (id: string) => void | Promise<void>;
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

  return (
    <View>
      <View style={styles.importReviewPanel}>
        <Text style={styles.importReviewTitle}>{title}</Text>
        <Text style={styles.helpText}>{helpText}</Text>
        <View style={styles.importReviewActions}>
          {suggestions.length > 0 && (
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
              {isImporting ? "Importing" : "Import File"}
            </Text>
          </Pressable>
        </View>
      </View>

      {!!importMessage && !error && (
        <Text style={styles.importReviewMessage}>{importMessage}</Text>
      )}

      {isLoading && (
        <View style={styles.importStatusCard}>
          <Text style={styles.helpText}>Loading import suggestions...</Text>
        </View>
      )}

      {!isLoading && !!error && (
        <View style={styles.importStatusCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && !error && suggestions.length === 0 && (
        <EmptyState
          title="No import suggestions"
          body={emptyBody}
        />
      )}

      {!isLoading && !error && suggestions.length > 0 && (
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
  return {
    amount: formatSuggestionAmount(suggestion),
    meta: `${formatInterval(suggestion.detectedInterval)} • ${formatSuggestionDateLabel(
      suggestion
    )} • ${suggestion.occurrenceCount} matches`,
    status:
      suggestion.suggestionKind === "income"
        ? suggestion.detectedInterval === "irregular"
          ? "Possible Income"
          : "Likely Income"
        : suggestion.detectedInterval === "irregular"
          ? "Possible Bill"
          : "Likely Recurring Payment",
    statusTone: getImportSuggestionTone(suggestion),
    title: suggestion.suggestedName,
  };
}

function getImportSuggestionTone(suggestion: ImportSuggestion): StatusPillTone {
  return suggestion.suggestionKind === "income" ? "accent" : "warning";
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
  const kindLabel = formatSuggestionKind(suggestion);
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
          <StatusPill
            label={kindLabel}
            tone={getImportSuggestionTone(suggestion)}
          />
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

function formatSuggestionKind(suggestion: ImportSuggestion) {
  if (suggestion.suggestionKind === "income") {
    return suggestion.detectedInterval === "irregular" ? "Possible Income" : "Income";
  }

  return suggestion.detectedInterval === "irregular" ? "Possible Bill" : "Bill";
}

function groupImportSuggestions(suggestions: ImportSuggestion[]) {
  const groups: {
    title: string;
    suggestions: ImportSuggestion[];
  }[] = [
    { title: "Likely Recurring Payments", suggestions: [] },
    { title: "Possible Bills", suggestions: [] },
    { title: "Possible Income", suggestions: [] },
    { title: "Review Suggested", suggestions: [] },
  ];

  for (const suggestion of suggestions) {
    if (
      suggestion.suggestionKind === "bill" &&
      suggestion.occurrenceCount > 1 &&
      suggestion.detectedInterval !== "irregular"
    ) {
      groups[0].suggestions.push(suggestion);
      continue;
    }

    if (suggestion.suggestionKind === "income") {
      groups[2].suggestions.push(suggestion);
      continue;
    }

    if (isLikelyPossibleBill(suggestion)) {
      groups[1].suggestions.push(suggestion);
      continue;
    }

    groups[3].suggestions.push(suggestion);
  }

  return groups.filter((group) => group.suggestions.length > 0);
}

function isLikelyPossibleBill(suggestion: ImportSuggestion) {
  if (suggestion.suggestionKind !== "bill") {
    return false;
  }

  return (
    suggestion.occurrenceCount > 1 ||
    isNearCommonBillingDate(suggestion.suggestedDate) ||
    suggestion.suggestedAmountCents >= 5000
  );
}

function isNearCommonBillingDate(date: string | null) {
  if (!date) {
    return false;
  }

  const day = Number(date.slice(-2));

  return (
    (day >= 1 && day <= 5) ||
    (day >= 14 && day <= 16) ||
    day >= 28
  );
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
