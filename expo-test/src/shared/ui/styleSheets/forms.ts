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

export function createFormStyles({
  colors,
  surfaces,
  shadows,
}: StyleFactoryInput) {
  return StyleSheet.create({
  inputLabel: {
    color: colors.text,
    fontSize: fontSize.label,
    ...fontStyle("semibold"),
    marginBottom: spacing.sm - 2,
    marginTop: spacing.sm - 2,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: surfaces.cardBorderSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md - 1,
    fontSize: fontSize.bodyLg,
    marginBottom: spacing.sm - 2,
    color: colors.text,
    ...fontStyle("regular"),
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
  },
  readOnlyField: {
    backgroundColor: colors.soft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  readOnlyText: {
    color: colors.text,
    fontSize: fontSize.bodyLg,
    ...fontStyle("medium"),
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.soft,
    borderRadius: radius.sm,
    padding: spacing.xs - 1,
    marginBottom: spacing.md,
  },
  segmentedControlOption: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedControlOptionActive: {
    backgroundColor: colors.card,
    ...shadows.subtle,
  },
  segmentedControlText: {
    color: colors.muted,
    fontSize: fontSize.body,
    ...fontStyle("semibold"),
  },
  segmentedControlTextActive: {
    color: colors.accentDark,
    ...fontStyle("bold"),
  },
  datePickerFrame: {
    minHeight: 220,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  datePicker: {
    height: 220,
    width: "100%",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  calendarNavButton: {
    width: 38,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 0,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  calendarNavText: {
    color: colors.accentDark,
    fontSize: 28,
    lineHeight: 30,
    ...fontStyle("regular"),
  },
  calendarMonthText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.bodyLg,
    ...fontStyle("bold"),
    textAlign: "center",
  },
  calendarQuickChips: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  calendarQuickChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md + 1,
    borderRadius: radius.lg + 4,
    backgroundColor: colors.rowSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarQuickChipSelected: {
    backgroundColor: colors.accentLight,
  },
  calendarQuickChipText: {
    color: colors.muted,
    fontSize: fontSize.label,
    ...fontStyle("semibold"),
  },
  calendarQuickChipTextSelected: {
    color: colors.accentDark,
    ...fontStyle("bold"),
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  calendarWeekday: {
    width: `${100 / 7}%`,
    color: colors.muted,
    fontSize: fontSize.caption,
    ...fontStyle("bold"),
    textAlign: "center",
    paddingBottom: spacing.xs + 1,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs - 2,
  },
  calendarDayInner: {
    width: spacing.xxxl,
    height: spacing.xxxl,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  calendarDaySelected: {
    backgroundColor: colors.accent,
  },
  calendarDayToday: {
    borderColor: colors.accentLight,
    backgroundColor: colors.card,
  },
  calendarDayText: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: lineHeight.tight + 1,
    ...fontStyle("medium"),
    textAlign: "center",
    includeFontPadding: false,
  },
  calendarDaySelectedText: {
    color: colors.onAccent,
    ...fontStyle("bold"),
  },
  calendarDayTodayText: {
    color: colors.accentDark,
    ...fontStyle("bold"),
  },
  calendarDoneButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentDark,
  },
  keyboardAccessory: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    alignItems: "flex-end",
  },
  keyboardDoneButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardDoneText: {
    color: colors.accentDark,
    fontSize: fontSize.bodyLg,
    ...fontStyle("bold"),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    backgroundColor: colors.card,
    overflow: "hidden",
    position: "relative",
    padding: spacing.xl + 2,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  sheetScrollable: {
    maxHeight: "88%",
    padding: 0,
  },
  sheetScrollContent: {
    padding: spacing.xl + 2,
  },
  sheetDragHandleRow: {
    alignItems: "center",
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
  },
  sheetDragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  onboardingSheetTall: {
    maxHeight: "88%",
  },
  });
}
