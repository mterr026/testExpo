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

export function createBillsStyles({
  colors,
  surfaces,
  shadows,
}: StyleFactoryInput) {
  return StyleSheet.create({
  billRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    minHeight: 76,
  },
  billRowPaid: {
    backgroundColor: colors.rowSurface,
  },
  billRowPaused: {
    backgroundColor: colors.rowSurface,
  },
  billRowProjected: {
    backgroundColor: surfaces.card,
    borderWidth: 1,
    borderColor: surfaces.dividerWarm,
    ...shadows.subtle,
  },
  billRowEmpty: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    ...shadows.subtle,
  },
  billListGroup: {
    gap: spacing.lg,
  },
  billGroupedList: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  billGroupedListRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: surfaces.divider,
  },
  billGroupedSwipeRow: {
    overflow: "hidden",
    borderRadius: 0,
    ...shadows.none,
  },
  billDateBadge: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: surfaces.timelineBadge,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    flexShrink: 0,
  },
  billDateBadgeDue: {
    backgroundColor: colors.accentLight,
  },
  billDateBadgePaid: {
    backgroundColor: colors.rowSurface,
  },
  billDateBadgeScheduled: {
    backgroundColor: colors.rowSurface,
  },
  billDateBadgePaused: {
    backgroundColor: colors.rowSurface,
  },
  billDateMonth: {
    color: colors.muted,
    fontSize: fontSize.caption,
    ...fontStyle("bold"),
    textTransform: "uppercase",
    letterSpacing: 0.6,
    lineHeight: lineHeight.tight - 3,
  },
  billDateMonthDue: {
    color: colors.accent,
  },
  billDateDay: {
    color: colors.text,
    fontSize: fontSize.title + 1,
    ...fontStyle("bold"),
    lineHeight: lineHeight.body,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
  },
  billRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    minWidth: 0,
  },
  billTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  billTitleText: {
    flex: 1,
    minWidth: 0,
  },
  billDueMeta: {
    color: colors.muted,
    fontSize: fontSize.meta,
    lineHeight: lineHeight.tight,
    ...fontStyle("medium"),
  },
  billAmountColumn: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    flexShrink: 0,
    minWidth: 96,
  },
  billAmount: {
    color: colors.text,
    fontSize: fontSize.title,
    lineHeight: lineHeight.body,
    ...fontStyle("heavy"),
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  billAmountPaid: {
    color: colors.warmText,
  },
  billAmountDue: {
    color: colors.accent,
  },
  billSwipeableCard: {
    backgroundColor: surfaces.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  billSwipeableRowForeground: {
    backgroundColor: surfaces.card,
    marginBottom: 0,
  },
  billsContentInner: {
    paddingBottom: homeChrome.navClearance + spacing.xl,
  },
  });
}
