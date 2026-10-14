import assert from "node:assert/strict";
import test from "node:test";
import {
  convertMinorUnits,
  formatCurrency,
  formatFinanceDate,
  parseCurrencyAmount,
} from "./currency.ts";

test("formats currency codes and parses positive minor-unit amounts", () => {
  assert.equal(formatCurrency(12345, "USD", "en-US"), "$123.45");
  assert.equal(parseCurrencyAmount("123.45"), 12345);
  assert.equal(parseCurrencyAmount("0"), null);
  assert.equal(parseCurrencyAmount("-1.00"), null);
  assert.equal(parseCurrencyAmount("1.234"), null);
  assert.equal(convertMinorUnits(101, 1.5), 152);
  assert.throws(() => convertMinorUnits(Number.MAX_SAFE_INTEGER, 2));
});

test("formats dates using the selected user preference", () => {
  assert.equal(formatFinanceDate("2026-10-14", "DD/MM/YYYY"), "14/10/2026");
  assert.equal(formatFinanceDate("2026-10-14", "MM/DD/YYYY"), "10/14/2026");
  assert.equal(formatFinanceDate("2026-10-14", "YYYY-MM-DD"), "2026-10-14");
});
