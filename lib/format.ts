const englishNumberFormatter = new Intl.NumberFormat("en-US");
const arabicDateTimeFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatEnglishNumber(value: number) {
  return englishNumberFormatter.format(value);
}

export function formatArabicDateTime(value: Date | string) {
  return arabicDateTimeFormatter.format(
    typeof value === "string" ? new Date(value) : value,
  );
}
