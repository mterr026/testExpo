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

export function createActionStyles({
  colors,
  surfaces,
  shadows,
}: StyleFactoryInput) {
  return StyleSheet.create({
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rowPrimaryAction: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  rowPrimaryActionText: {
    color: colors.accentDark,
    fontSize: 13,
    ...fontStyle("heavy"),
  },
  rowPrimaryActionInline: {
    alignSelf: "flex-start",
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowSecondaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowSecondaryActionButton: {
    minHeight: 30,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  rowSecondaryActionText: {
    color: colors.muted,
    fontSize: 13,
    ...fontStyle("semibold"),
  },
  rowSecondaryDangerText: {
    color: colors.warningText,
  },
  rowActionButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accentLight,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  rowActionButtonPrimary: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  rowActionButtonDanger: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rowActionText: {
    color: colors.accentDark,
    fontSize: 13,
    ...fontStyle("semibold"),
  },
  rowActionDangerText: {
    color: colors.muted,
  },
  envelopeSwipeableCard: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  envelopeSwipeableRowForeground: {
    backgroundColor: surfaces.card,
  },
  actionMenuOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  actionMenuSheet: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 2,
    borderTopLeftRadius: radius.sheet + 4,
    borderTopRightRadius: radius.sheet + 4,
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },
  actionMenuHeader: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: surfaces.divider,
    marginBottom: spacing.xs - 1,
  },
  actionMenuHeaderTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md + 2,
  },
  actionMenuTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    ...fontStyle("bold"),
  },
  actionMenuHeaderMeta: {
    color: colors.muted,
    fontSize: fontSize.label,
    ...fontStyle("medium"),
    marginTop: spacing.xs,
  },
  actionMenuHeaderAmount: {
    color: colors.text,
    fontSize: fontSize.title + 1,
    ...fontStyle("heavy"),
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  actionMenuItem: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: surfaces.divider,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  actionMenuDangerItem: {
    marginTop: spacing.sm,
    borderTopColor: surfaces.dividerWarm,
  },
  actionMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm - 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  actionMenuDangerIcon: {
    backgroundColor: colors.warning,
  },
  actionMenuIconText: {
    color: colors.accentDark,
    fontSize: fontSize.body,
    ...fontStyle("bold"),
    lineHeight: lineHeight.tight,
  },
  actionMenuItemText: {
    color: colors.accentDark,
    fontSize: fontSize.bodyLg,
    ...fontStyle("semibold"),
  },
  actionMenuErrorText: {
    color: colors.warningText,
    fontSize: fontSize.meta,
    lineHeight: lineHeight.tight - 1,
    marginTop: spacing.sm - 2,
  },
  actionMenuDangerText: {
    color: colors.warningText,
  },
  actionMenuCancel: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  actionMenuCloseText: {
    color: colors.muted,
    ...fontStyle("semibold"),
    fontSize: fontSize.bodyLg,
  },
  overflowButton: {
    width: 28,
    height: 26,
    borderRadius: radius.sm - 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  overflowButtonText: {
    color: colors.accentDark,
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.body,
    ...fontStyle("bold"),
    marginTop: -5,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: spacing.md + 2,
  },
  cancelButtonText: {
    color: colors.muted,
    ...fontStyle("semibold"),
    fontSize: fontSize.bodyLg,
  },
  });
}
