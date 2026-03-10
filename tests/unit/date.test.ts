import { describe, expect, it } from "vitest";

import {
  addDaysToDateKey,
  getDistributionDateKey,
  getRemainingDays,
} from "@/lib/date";

describe("date helpers", () => {
  it("adds days to an ISO date key", () => {
    expect(addDaysToDateKey("2026-03-10", 3)).toBe("2026-03-13");
  });

  it("calculates tomorrow using Cairo time", () => {
    const date = new Date("2026-03-10T22:30:00.000Z");

    expect(getDistributionDateKey(date, "Africa/Cairo")).toBe("2026-03-12");
  });

  it("calculates remaining days inclusively", () => {
    const date = new Date("2026-03-10T12:00:00.000Z");

    expect(getRemainingDays("2026-03-20", date, "Africa/Cairo")).toBe(10);
  });
});
