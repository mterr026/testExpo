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

export function createStatusStyles({
  colors,
  surfaces,
  shadows,
}: StyleFactoryInput) {
  return StyleSheet.create({
  warningCard: {
    backgroundColor: colors.warning,
  },
  warningText: {
    color: colors.warningText,
  },
  noteCard: {
    backgroundColor: colors.warm,
    borderRadius: radius.sm,
    padding: spacing.md + 2,
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  noteTitle: {
    fontSize: 17,
    ...fontStyle("semibold"),
    color: colors.text,
    marginBottom: 6,
  },
  helpText: {
    color: colors.muted,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
  },
  statusText: {
    marginTop: 12,
    color: colors.accentDark,
    ...fontStyle("semibold"),
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    minHeight: 24,
    justifyContent: "center",
  },
  statusPillMenu: {
    marginTop: spacing.sm + 1,
  },
  statusPillText: {
    fontSize: fontSize.caption,
    ...fontStyle("bold"),
    letterSpacing: 0.2,
    lineHeight: lineHeight.tight - 2,
  },
  statusPillAccent: {
    backgroundColor: colors.accentLight,
  },
  statusPillTextAccent: {
    color: colors.accentDark,
  },
  statusPillNeutral: {
    backgroundColor: colors.soft,
  },
  statusPillTextNeutral: {
    color: colors.warmText,
  },
  statusPillWarning: {
    backgroundColor: colors.warning,
  },
  statusPillTextWarning: {
    color: colors.warningText,
  },
  statusPillMuted: {
    backgroundColor: colors.rowSurface,
  },
  statusPillTextMuted: {
    color: colors.muted,
  },
  statusPillWarm: {
    backgroundColor: colors.warm,
  },
  statusPillTextWarm: {
    color: colors.warningText,
  },
  errorText: {
    color: colors.warningText,
    fontSize: fontSize.body,
    ...fontStyle("medium"),
    marginTop: spacing.xs - 2,
    marginBottom: spacing.sm + 2,
  },
  successText: {
    color: colors.accentDark,
    fontSize: fontSize.label,
    ...fontStyle("medium"),
    lineHeight: lineHeight.tight + 1,
    marginTop: spacing.sm - 2,
  },
  disabledAction: {
    opacity: 0.55,
  },
  });
}
