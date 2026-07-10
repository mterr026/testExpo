import { StyleSheet } from "react-native";

import type { AppTheme } from "../theme";
import type { ThemeShadows } from "../shadows";
import {
  fontSize,
  fontStyle,
  lineHeight,
  radius,
  spacing,
} from "../tokens";

type StyleFactoryInput = {
  colors: AppTheme["colors"];
  surfaces: AppTheme["surfaces"];
  shadows: ThemeShadows;
};

export function createImportStyles({
  colors,
  surfaces,
  shadows,
}: StyleFactoryInput) {
  return StyleSheet.create({
  importIncomeAmount: {
    color: colors.accent,
  },
  importGroupHeader: {
    color: colors.muted,
    fontSize: fontSize.meta,
    ...fontStyle("bold"),
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  importReviewPanel: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.section,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  importReviewTitle: {
    color: colors.text,
    fontSize: fontSize.sectionCompact,
    ...fontStyle("bold"),
    marginBottom: spacing.xs,
  },
  importReviewActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: "flex-end",
  },
  importReviewMessage: {
    color: colors.muted,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    marginBottom: spacing.md,
  },
  importPrivacyNote: {
    color: colors.warmText,
    fontSize: fontSize.meta,
    lineHeight: lineHeight.body,
    marginTop: spacing.sm,
  },
  importSuggestionListGroup: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  importSuggestionRow: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  importSuggestionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: surfaces.divider,
  },
  importSuggestionTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  importSuggestionAmountColumn: {
    alignItems: "flex-end",
    gap: spacing.xs,
    flexShrink: 0,
  },
  importSuggestionAmount: {
    color: colors.warningText,
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.body,
    ...fontStyle("bold"),
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  importSuggestionMeta: {
    color: colors.muted,
    fontSize: fontSize.meta,
    lineHeight: lineHeight.tight,
    ...fontStyle("medium"),
  },
  importStatusCard: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  importLoadingCard: {
    alignItems: "center",
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    ...shadows.subtle,
  },
  importLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(246, 243, 234, 0.88)",
    borderRadius: radius.sheet,
    justifyContent: "center",
    padding: spacing.xl,
    zIndex: 20,
  },
  importLoadingModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(11, 31, 51, 0.28)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  importLoadingOverlayCard: {
    marginBottom: 0,
    width: "100%",
  },
  importLoadingSpinnerWrap: {
    alignItems: "center",
    height: 56,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 56,
  },
  importLoadingPulseRing: {
    backgroundColor: colors.accentLight,
    borderRadius: 28,
    height: 56,
    position: "absolute",
    width: 56,
  },
  importLoadingTitle: {
    color: colors.text,
    fontSize: fontSize.bodyLg,
    ...fontStyle("bold"),
    textAlign: "center",
  },
  importLoadingSubtitle: {
    color: colors.muted,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    textAlign: "center",
  },
  importLoadingDotsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  importLoadingDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  });
}
