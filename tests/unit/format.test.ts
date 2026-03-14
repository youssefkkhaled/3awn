import { describe, expect, it } from "vitest";

import { formatArabicDateTime } from "@/lib/format";

describe("formatArabicDateTime", () => {
  it("formats timestamps in Cairo time by default", () => {
    const date = new Date("2026-03-13T15:00:00.000Z");
    const cairoFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    });
    const utcFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });

    expect(formatArabicDateTime(date)).toBe(cairoFormatter.format(date));
    expect(formatArabicDateTime(date)).not.toBe(utcFormatter.format(date));
  });

  it("returns a dash for invalid dates", () => {
    expect(formatArabicDateTime("not-a-date")).toBe("—");
  });
});
