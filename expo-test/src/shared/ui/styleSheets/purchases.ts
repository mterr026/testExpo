import { StyleSheet } from "react-native";

import type { AppTheme } from "../theme";
import type { ThemeShadows } from "../shadows";
import {
  fontSize,
  fontStyle,
  homeChrome,
  lineHeight,
  radius,
  spacing,
} from "../tokens";

type StyleFactoryInput = {
  colors: AppTheme["colors"];
  surfaces: AppTheme["surfaces"];
  shadows: ThemeShadows;
};

export function createPurchasesStyles({
  colors,
  surfaces,
  shadows,
}: StyleFactoryInput) {
  return StyleSheet.create({
  purchasesContentInner: {
    paddingBottom: homeChrome.navClearance + spacing.xl,
  },
  purchaseCycleHeaderCard: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.md + 2,
    ...shadows.subtle,
  },
  purchaseCycleHeaderTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    ...fontStyle("semibold"),
    marginBottom: spacing.xs,
  },
  purchaseCycleHeaderSummary: {
    color: colors.warmText,
    fontSize: fontSize.label,
    lineHeight: lineHeight.tight + 2,
    ...fontStyle("semibold"),
    fontVariant: ["tabular-nums"],
  },
  purchaseSummaryCard: {
    backgroundColor: surfaces.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 2,
    marginBottom: spacing.md + 2,
    ...shadows.raised,
  },
  purchaseSummaryGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md + 1,
  },
  purchaseSummaryMetric: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    backgroundColor: colors.rowSurface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  purchaseSummaryValue: {
    color: colors.warmText,
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.body,
    ...fontStyle("semibold"),
    marginTop: spacing.xs,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  purchaseSummaryValueHighlight: {
    color: colors.warningText,
    fontSize: fontSize.title,
    ...fontStyle("bold"),
  },
  purchaseSummaryLabel: {
    color: colors.muted,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.tight - 3,
    ...fontStyle("semibold"),
    textAlign: "center",
  },
  purchaseSummaryCycleWindow: {
    color: colors.muted,
    fontSize: fontSize.meta,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  purchaseBackToActiveCycleButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.rowSurface,
  },
  purchaseBackToActiveCycleText: {
    color: colors.accentDark,
    fontSize: fontSize.label,
    ...fontStyle("bold"),
  },
  purchaseCyclePickerButton: {
    minWidth: 96,
    maxWidth: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.rowSurface,
    alignItems: "flex-end",
  },
  purchaseCycleSelectorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.rowSurface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 1,
    marginBottom: spacing.md,
    minHeight: 44,
    ...shadows.subtle,
  },
  purchaseCycleSelectorLabel: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
  },
  purchaseCycleSelectorChevron: {
    color: colors.muted,
    fontSize: fontSize.label,
    ...fontStyle("bold"),
  },
  purchaseSummaryStripPanel: {
    backgroundColor: surfaces.card,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  purchaseSummaryStripText: {
    color: colors.warmText,
    fontSize: fontSize.label,
    ...fontStyle("semibold"),
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  purchaseCyclePickerLabel: {
    color: colors.muted,
    fontSize: fontSize.meta,
    ...fontStyle("bold"),
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  purchaseCyclePickerValue: {
    color: colors.text,
    fontSize: fontSize.label,
    ...fontStyle("bold"),
    marginTop: 2,
  },
  purchaseCycleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.rowSurface,
    marginBottom: spacing.sm,
  },
  purchaseCycleOptionActive: {
    backgroundColor: colors.accentLight,
  },
  purchaseCycleOptionTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
  },
  purchaseCycleOptionMeta: {
    color: colors.muted,
    fontSize: fontSize.meta,
    marginTop: 2,
  },
  purchaseCycleOptionAmountBlock: {
    alignItems: "flex-end",
  },
  purchaseCycleOptionAmount: {
    color: colors.text,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
  },
  purchaseCycleOptionSelected: {
    color: colors.accentDark,
    fontSize: fontSize.meta,
    ...fontStyle("bold"),
    marginTop: 2,
  },
  purchasePastCycleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.subtle,
  },
  purchasePastCycleRowSelected: {
    backgroundColor: colors.accentLight,
  },
  purchasePastCycleSection: {
    marginTop: spacing.xl,
  },
  purchaseOutsideCycleSection: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  purchaseOutsideCycleMeta: {
    color: colors.muted,
    fontSize: fontSize.meta,
    lineHeight: lineHeight.tight,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  purchasePreviousCycleGroup: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  purchasePreviousCycleRow: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.card,
  },
  purchasePreviousCycleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  purchasePreviousCycleTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
  },
  purchasePreviousCycleMeta: {
    color: colors.muted,
    fontSize: fontSize.meta,
    marginTop: 2,
  },
  purchasePreviousCycleAmount: {
    color: colors.text,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },
  purchasePreviousCycleExpanded: {
    marginTop: spacing.sm,
  },
  purchasePastCycleRowTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
  },
  purchasePastCycleRowMeta: {
    color: colors.muted,
    fontSize: fontSize.meta,
    marginTop: 2,
  },
  purchasePastCycleRowAmount: {
    color: colors.text,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
    fontVariant: ["tabular-nums"],
  },
  purchaseUnassignedNotice: {
    marginTop: spacing.lg,
    backgroundColor: colors.rowSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 1,
    ...shadows.subtle,
  },
  purchaseUnassignedNoticeText: {
    color: colors.muted,
    fontSize: fontSize.meta,
    lineHeight: lineHeight.tight,
  },
  filterChipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.lg + 4,
    backgroundColor: colors.rowSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.accentDark,
  },
  filterChipText: {
    color: colors.muted,
    fontSize: fontSize.label,
    ...fontStyle("bold"),
  },
  filterChipTextActive: {
    color: colors.onAccent,
  },
  transactionFeed: {
    marginBottom: spacing.md,
  },
  transactionDateGroup: {
    marginBottom: spacing.lg,
  },
  transactionDateHeader: {
    color: colors.muted,
    fontSize: fontSize.meta,
    ...fontStyle("bold"),
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  transactionListGroup: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 0,
    ...shadows.card,
  },
  purchaseSwipeableList: {
    gap: spacing.sm,
  },
  purchaseSwipeableCard: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  purchaseSwipeableRowForeground: {
    backgroundColor: surfaces.card,
  },
  purchaseSwipeActions: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  purchaseSwipeAction: {
    width: 76,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  purchaseSwipeActionAccent: {
    backgroundColor: colors.accentLight,
  },
  purchaseSwipeActionDefault: {
    backgroundColor: colors.soft,
  },
  purchaseSwipeActionDestructive: {
    backgroundColor: colors.warning,
  },
  purchaseSwipeActionIcon: {
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.body,
  },
  purchaseSwipeActionLabel: {
    color: colors.accentDark,
    fontSize: fontSize.caption,
    ...fontStyle("semibold"),
    lineHeight: lineHeight.tight,
    textAlign: "center",
  },
  purchaseSwipeActionLabelDestructive: {
    color: colors.warningText,
  },
  purchaseTransactionRow: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  purchaseRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    minWidth: 0,
  },
  transactionRow: {
    minHeight: 56,
    paddingHorizontal: spacing.md + 1,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  transactionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: surfaces.divider,
  },
  transactionTitle: {
    color: colors.text,
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.body,
    ...fontStyle("semibold"),
  },
  transactionAmountStack: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  transactionAmount: {
    color: colors.warningText,
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.body,
    ...fontStyle("heavy"),
  },
  purchaseTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  purchaseTitleText: {
    flex: 1,
    minWidth: 0,
  },
  purchaseAmountColumn: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    flexShrink: 0,
    minWidth: 96,
  },
  purchaseAmount: {
    color: colors.accent,
    fontSize: fontSize.title,
    lineHeight: lineHeight.body,
    ...fontStyle("heavy"),
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  purchaseAmountPending: {
    color: colors.accent,
  },
  purchaseAmountCharged: {
    color: colors.warmText,
  },
  purchaseInput: {
    paddingVertical: spacing.sm + 1,
    marginBottom: spacing.sm,
  },
  purchaseAmountHeroInput: {
    fontSize: fontSize.displaySm,
    lineHeight: lineHeight.displaySm,
    ...fontStyle("heavy"),
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  purchaseRecentMerchantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  });
}
