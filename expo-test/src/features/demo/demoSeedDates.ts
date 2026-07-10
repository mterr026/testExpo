import { getTodayIsoDate } from "@/shared/dates";

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day);

  nextDate.setDate(nextDate.getDate() + days);

  return buildLocalIsoDate(
    nextDate.getFullYear(),
    nextDate.getMonth() + 1,
    nextDate.getDate()
  );
}

export function demoDateFromToday(daysFromToday: number): string {
  return addDaysToIsoDate(getTodayIsoDate(), daysFromToday);
}

function buildLocalIsoDate(year: number, month: number, day: number) {
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}
