import { describe, expect, it } from "vitest";

import {
  addDaysToDateKey,
  getDistributionDateKey,
  getDistributionWindowDays,
  getRemainingDays,
} from "@/lib/date";

describe("date helpers", () => {
  it("adds days to an ISO date key", () => {
    expect(addDaysToDateKey("2026-03-10", 3)).toBe("2026-03-13");
  });

  it("keeps the same distribution date before 5 AM Cairo", () => {
    const date = new Date("2026-03-10T23:30:00.000Z");

    expect(getDistributionDateKey(date, "Africa/Cairo")).toBe("2026-03-11");
  });

  it("switches to the next distribution date from 5 AM Cairo", () => {
    const date = new Date("2026-03-11T03:30:00.000Z");

    expect(getDistributionDateKey(date, "Africa/Cairo")).toBe("2026-03-12");
  });

  it("calculates remaining days excluding today", () => {
    const date = new Date("2026-03-10T12:00:00.000Z");

    expect(getRemainingDays("2026-03-20", date, "Africa/Cairo")).toBe(10);
  });

  it("calculates distribution window days from the active distribution day", () => {
    const date = new Date("2026-03-11T01:00:00+02:00");

    expect(getDistributionWindowDays("2026-03-20", date, "Africa/Cairo")).toBe(10);
  });
});
