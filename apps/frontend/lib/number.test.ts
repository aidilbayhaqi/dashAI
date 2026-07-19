import { describe, expect, it } from "vitest";

import { formatNumberInputValue, parseFormNumber, parseLocalizedNumber } from "./number";


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


describe("parseFormNumber", () => {
  it.each([
    ["20.000", 20],
    ["20.0000", 20],
    ["20000", 20000],
    ["12.5", 12.5],
    ["1.000,50", 1000.5],
  ])("parses form value %s as %s", (input, expected) => {
    expect(parseFormNumber(input)).toBe(expected);
  });
});

describe("formatNumberInputValue", () => {
  it.each([
    ["20.000", "20"],
    ["20.5000", "20.5"],
    ["20000.00", "20000"],
  ])("compacts %s to %s", (input, expected) => {
    expect(formatNumberInputValue(input)).toBe(expected);
  });
});
