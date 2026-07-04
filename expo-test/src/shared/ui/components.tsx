import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import {
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { formatCurrency } from "@/shared/currency";

import { styles } from "./styles";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.helpText}>{body}</Text>
    </View>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

export type StatusPillTone = "accent" | "neutral" | "warning" | "muted" | "warm";

export function StatusPill({
  label,
  menu = false,
  tone,
}: {
  label: string;
  menu?: boolean;
  tone: StatusPillTone;
}) {
  const toneStyles = getStatusPillToneStyles(tone);

  return (
    <View
      style={[
        styles.statusPill,
        toneStyles.container,
        menu && styles.statusPillMenu,
      ]}
    >
      <Text style={[styles.statusPillText, toneStyles.text]}>{label}</Text>
    </View>
  );
}

function getStatusPillToneStyles(tone: StatusPillTone) {
  switch (tone) {
    case "accent":
      return {
        container: styles.statusPillAccent,
        text: styles.statusPillTextAccent,
      };
    case "neutral":
      return {
        container: styles.statusPillNeutral,
        text: styles.statusPillTextNeutral,
      };
    case "warning":
      return {
        container: styles.statusPillWarning,
        text: styles.statusPillTextWarning,
      };
    case "muted":
      return {
        container: styles.statusPillMuted,
        text: styles.statusPillTextMuted,
      };
    case "warm":
      return {
        container: styles.statusPillWarm,
        text: styles.statusPillTextWarm,
      };
  }
}

export type ActionMenuItem = {
  icon?: string;
  label: string;
  closeBeforeAction?: boolean;
  destructive?: boolean;
  onPress: () => void | Promise<void>;
};

export type ActionMenuHeader = {
  amount?: string;
  meta?: string;
  status?: string;
  statusTone?: StatusPillTone;
  title: string;
};

export function ActionMenu({
  header,
  title,
  visible,
  actions,
  onClose,
}: {
  header?: ActionMenuHeader;
  title: string;
  visible: boolean;
  actions: ActionMenuItem[];
  onClose: () => void;
}) {
  const [actionError, setActionError] = useState("");

  async function handleActionPress(action: ActionMenuItem) {
    try {
      setActionError("");
      if (action.closeBeforeAction) {
        onClose();
        setTimeout(() => {
          void action.onPress();
        }, 0);
        return;
      }

      await action.onPress();
      onClose();
    } catch {
      setActionError("Action could not be completed. Check the app logs.");
      // Keep the sheet open so the user does not lose context on failure.
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.actionMenuOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.actionMenuSheet}>
          {header ? (
            <View style={styles.actionMenuHeader}>
              <View style={styles.actionMenuHeaderTopRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.actionMenuTitle}>{header.title}</Text>
                  {header.meta ? (
                    <Text style={styles.actionMenuHeaderMeta}>{header.meta}</Text>
                  ) : null}
                </View>
                {header.amount ? (
                  <Text style={styles.actionMenuHeaderAmount}>{header.amount}</Text>
                ) : null}
              </View>
              {header.status ? (
                <StatusPill
                  label={header.status}
                  menu
                  tone={header.statusTone ?? "accent"}
                />
              ) : null}
            </View>
          ) : (
            <Text style={styles.actionMenuTitle}>{title}</Text>
          )}
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                styles.actionMenuItem,
                action.destructive && styles.actionMenuDangerItem,
                pressed && styles.pressed,
              ]}
              onPress={() => handleActionPress(action)}
            >
              <View
                style={[
                  styles.actionMenuIcon,
                  action.destructive && styles.actionMenuDangerIcon,
                ]}
              >
                <Text
                  style={[
                    styles.actionMenuIconText,
                    action.destructive && styles.actionMenuDangerText,
                  ]}
                >
                  {action.icon ?? "•"}
                </Text>
              </View>
              <Text
                style={[
                  styles.actionMenuItemText,
                  action.destructive && styles.actionMenuDangerText,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
          {actionError ? (
            <Text style={styles.actionMenuErrorText}>{actionError}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.actionMenuCancel,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.actionMenuCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function OverflowButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Open actions"
      accessibilityRole="button"
      hitSlop={10}
      style={({ pressed }) => [
        styles.overflowButton,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.overflowButtonText}>⋯</Text>
    </Pressable>
  );
}

export function money(value: number) {
  return formatCurrency(value);
}

export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [iosDraftDate, setIosDraftDate] = useState(() => parseIsoDate(value));
  const selectedDate = parseIsoDate(value);
  const iosCalendarDays = useMemo(
    () => buildCalendarDays(iosDraftDate),
    [iosDraftDate]
  );

  function openDatePicker() {
    Keyboard.dismiss();

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "date",
        value: selectedDate,
        onValueChange: (_event, date) => handleDateValueChange(date),
      });
      return;
    }

    setIosDraftDate(selectedDate);
    setIosPickerOpen(true);
  }

  function handleDateValueChange(date: Date) {
    onChange(formatIsoDate(date));
  }

  function closeIosPicker() {
    setIosPickerOpen(false);
  }

  function saveIosDraftDate() {
    onChange(formatIsoDate(iosDraftDate));
    closeIosPicker();
  }

  function changeDraftMonth(monthOffset: number) {
    setIosDraftDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + monthOffset);

      return clampDateToMonth(nextDate, currentDate.getDate());
    });
  }

  function selectQuickDate(dayOffset: number) {
    const nextDate = new Date();
    nextDate.setHours(0, 0, 0, 0);
    nextDate.setDate(nextDate.getDate() + dayOffset);
    setIosDraftDate(nextDate);
  }

  const today = createTodayDate();

  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.readOnlyField,
          pressed && styles.pressed,
        ]}
        onPress={openDatePicker}
      >
        <Text style={styles.readOnlyText}>{value}</Text>
      </Pressable>

      <Modal visible={iosPickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeIosPicker}
          />
          <View style={styles.sheet}>
            <Text style={styles.sectionTitle}>{label}</Text>
            <View style={styles.calendarQuickChips}>
              <CalendarQuickChip
                label="Today"
                selected={isSameCalendarDate(iosDraftDate, today)}
                onPress={() => selectQuickDate(0)}
              />
              <CalendarQuickChip
                label="Yesterday"
                selected={isSameCalendarDate(
                  iosDraftDate,
                  offsetDate(today, -1)
                )}
                onPress={() => selectQuickDate(-1)}
              />
            </View>
            <View style={styles.calendarHeader}>
              <Pressable
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => changeDraftMonth(-1)}
              >
                <Text style={styles.calendarNavText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarMonthText}>
                {formatMonthLabel(iosDraftDate)}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => changeDraftMonth(1)}
              >
                <Text style={styles.calendarNavText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {weekdays.map((weekday) => (
                <Text
                  key={weekday.id}
                  style={styles.calendarWeekday}
                >
                  {weekday.label}
                </Text>
              ))}
              {iosCalendarDays.map((calendarDay, index) => {
                const isSelected =
                  calendarDay != null &&
                  isSameCalendarDate(calendarDay, iosDraftDate);
                const isToday =
                  calendarDay != null && isSameCalendarDate(calendarDay, today);

                return (
                  <Pressable
                    key={calendarDay ? formatIsoDate(calendarDay) : `empty-${index}`}
                    disabled={!calendarDay}
                    style={({ pressed }) => [
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      isToday && !isSelected && styles.calendarDayToday,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      if (calendarDay) {
                        setIosDraftDate(calendarDay);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.calendarDayInner,
                        isSelected && styles.calendarDaySelected,
                        isToday && !isSelected && styles.calendarDayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDaySelectedText,
                          isToday && !isSelected && styles.calendarDayTodayText,
                        ]}
                      >
                        {calendarDay ? calendarDay.getDate() : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.calendarDoneButton,
                pressed && styles.pressed,
              ]}
              onPress={saveIosDraftDate}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={closeIosPicker}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CalendarQuickChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.calendarQuickChip,
        selected && styles.calendarQuickChipSelected,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.calendarQuickChipText,
          selected && styles.calendarQuickChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const weekdays = [
  { id: "sun", label: "S" },
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
];

function buildCalendarDays(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayCount = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const calendarDays: (Date | null)[] = Array.from(
    { length: firstDay.getDay() },
    () => null
  );

  for (let day = 1; day <= dayCount; day += 1) {
    calendarDays.push(new Date(date.getFullYear(), date.getMonth(), day));
  }

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  return calendarDays;
}

function clampDateToMonth(monthDate: Date, preferredDay: number) {
  const lastDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  ).getDate();
  const safeDay = Math.min(preferredDay, lastDayOfMonth);

  return new Date(monthDate.getFullYear(), monthDate.getMonth(), safeDay);
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function isSameCalendarDate(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function createTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function offsetDate(date: Date, dayOffset: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + dayOffset);

  return nextDate;
}

export function KeyboardDoneAccessory({ nativeID }: { nativeID: string }) {
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.keyboardAccessory}>
        <Pressable
          style={({ pressed }) => [
            styles.keyboardDoneButton,
            pressed && styles.pressed,
          ]}
          onPress={Keyboard.dismiss}
        >
          <Text style={styles.keyboardDoneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

function parseIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
