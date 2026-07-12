import { describe, expect, it } from "vitest";

import { parseLocalizedNumber } from "./number";


describe("parseLocalizedNumber", () => {
  it.each<[string, number]>([
    ["1.000", 1000],
    ["1.000,50", 1000.5],
    ["1,000.50", 1000.5],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["Rp 2.500.000", 2500000],
    ["(1.250,25)", -1250.25],
  ])("parses %s", (input, expected) => {
    expect(parseLocalizedNumber(input)).toBe(expected);
  });

  it("returns undefined for empty and invalid values", () => {
    expect(parseLocalizedNumber("")).toBeUndefined();
    expect(parseLocalizedNumber("abc")).toBeUndefined();
  });
});
