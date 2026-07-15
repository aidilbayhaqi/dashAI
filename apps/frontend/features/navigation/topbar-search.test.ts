import { describe, expect, it } from "vitest";

import {
  filterNavigationCommands,
  navigationCommands,
} from "@/components/layout/topbar-search";

describe("topbar global search", () => {
  it("returns default navigation commands for an empty query", () => {
    expect(filterNavigationCommands("")).toEqual(
      navigationCommands.slice(0, 10),
    );
  });

  it("finds finance transactions using Indonesian keyword", () => {
    const results = filterNavigationCommands("transaksi");

    expect(
      results.some((item) => item.href === "/finance/transactions"),
    ).toBe(true);
  });

  it("finds finance taxes using Indonesian keyword", () => {
    const results = filterNavigationCommands("pajak");

    expect(
      results.some((item) => item.href === "/finance/taxes"),
    ).toBe(true);
  });

  it("finds general ledger using Indonesian phrase", () => {
    const results = filterNavigationCommands("buku besar");

    expect(
      results.some((item) => item.href === "/finance/ledger"),
    ).toBe(true);
  });

  it("finds stock control by keyword", () => {
    const results = filterNavigationCommands("stok");

    expect(
      results.some((item) => item.href === "/products/stock"),
    ).toBe(true);
  });

  it("supports multi-word search tokens", () => {
    const results = filterNavigationCommands("transaksi keuangan");

    expect(
      results.some((item) => item.href === "/finance/transactions"),
    ).toBe(true);
  });
});
