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

export function createSettingsStyles({
  colors,
  surfaces,
  shadows,
}: StyleFactoryInput) {
  return StyleSheet.create({
  settingsMoneyCard: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.section,
    ...shadows.card,
  },
  settingsMoneySection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  settingsMetricRow: {
    flexDirection: "row",
    backgroundColor: colors.rowSurface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  settingsMetric: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  settingsMetricDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: surfaces.divider,
  },
  settingsMetricLabel: {
    color: colors.muted,
    fontSize: fontSize.caption,
    ...fontStyle("semibold"),
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  settingsMetricValue: {
    color: colors.text,
    fontSize: fontSize.bodyLg,
    ...fontStyle("bold"),
    fontVariant: ["tabular-nums"],
  },
  settingsSectionHeader: {
    marginBottom: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  settingsPreferenceGroup: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    marginBottom: spacing.section,
    overflow: "hidden",
    ...shadows.card,
  },
  settingsPreferenceRow: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  settingsAppearanceControl: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  settingsPreferenceDivider: {
    borderBottomWidth: 1,
    borderBottomColor: surfaces.divider,
  },
  settingsSaveButton: {
    marginTop: spacing.md,
  },
  settingsGroupTitle: {
    color: colors.muted,
    fontSize: fontSize.meta,
    ...fontStyle("bold"),
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm - 2,
    marginTop: spacing.xs - 2,
  },
  settingsRow: {
    padding: spacing.md + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  settingsValue: {
    color: colors.accentDark,
    fontSize: fontSize.body,
    ...fontStyle("semibold"),
  },
  settingsInlineControl: {
    alignItems: "flex-end",
    gap: spacing.sm - 1,
    flexShrink: 0,
  },
  settingsActionColumn: {
    alignItems: "flex-end",
    gap: spacing.sm - 1,
    flexShrink: 0,
  },
  settingsActionButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingsActionButtonText: {
    color: colors.accentDark,
    fontSize: fontSize.label,
    ...fontStyle("bold"),
  },
  });
}
