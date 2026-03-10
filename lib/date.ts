import { DEFAULT_TIMEZONE } from "@/lib/seed";

function getDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<"year" | "month" | "day", string>;
}

function dateKeyToUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyToEpochDays(dateKey: string) {
  return Math.floor(dateKeyToUtcDate(dateKey).getTime() / 86_400_000);
}

export function getDateKeyInTimeZone(
  date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
) {
  const { year, month, day } = getDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const shifted = dateKeyToUtcDate(dateKey);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return utcDateToDateKey(shifted);
}

export function getDistributionDateKey(
  date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
) {
  return addDaysToDateKey(getDateKeyInTimeZone(date, timeZone), 1);
}

export function formatArabicDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dateKeyToUtcDate(dateKey));
}

export function getRemainingDays(
  campaignEndDate: string,
  date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
) {
  const todayKey = getDateKeyInTimeZone(date, timeZone);
  return Math.max(
    0,
    dateKeyToEpochDays(campaignEndDate) - dateKeyToEpochDays(todayKey),
  );
}

export function isCampaignEnded(
  campaignEndDate: string,
  date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
) {
  return getRemainingDays(campaignEndDate, date, timeZone) === 0;
}
