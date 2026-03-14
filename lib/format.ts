import { DEFAULT_TIMEZONE } from "@/lib/seed";

const englishNumberFormatter = new Intl.NumberFormat("en-US");
const arabicDateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getArabicDateTimeFormatter(timeZone: string) {
  const cachedFormatter = arabicDateTimeFormatters.get(timeZone);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });

  arabicDateTimeFormatters.set(timeZone, formatter);

  return formatter;
}

export function formatEnglishNumber(value: number) {
  return englishNumberFormatter.format(value);
}

export function formatArabicDateTime(
  value: Date | string,
  timeZone = DEFAULT_TIMEZONE,
) {
  const parsedValue = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(parsedValue.getTime())) {
    return "—";
  }

  return getArabicDateTimeFormatter(timeZone).format(parsedValue);
}
