export function getTodayIsoDate() {
  const now = new Date();

  return buildLocalIsoDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
}

function buildLocalIsoDate(year: number, month: number, day: number) {
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}
