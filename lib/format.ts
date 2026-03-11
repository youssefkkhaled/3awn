const englishNumberFormatter = new Intl.NumberFormat("en-US");
const arabicDateTimeFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatEnglishNumber(value: number) {
  return englishNumberFormatter.format(value);
}

export function formatArabicDateTime(value: Date | string) {
  const parsedValue = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(parsedValue.getTime())) {
    return "—";
  }

  return arabicDateTimeFormatter.format(parsedValue);
}
