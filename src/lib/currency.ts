import type { DateFormat } from "@/types/finance";

const rateCache = new Map<string, Promise<Map<string, number>>>();

export const supportedCurrencies = [
  "AED",
  "AUD",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "EUR",
  "GBP",
  "HKD",
  "IDR",
  "INR",
  "JPY",
  "KRW",
  "MXN",
  "NOK",
  "NZD",
  "SEK",
  "SGD",
  "THB",
  "USD",
] as const;

export function isCurrencyCode(value: string): boolean {
  try {
    return (
      /^[A-Z]{3}$/.test(value) &&
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: value,
      }).resolvedOptions().currency === value
    );
  } catch {
    return false;
  }
}

export function formatCurrency(
  amountMinor: number,
  currency = "INR",
  locale = "en-IN",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function parseCurrencyAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function formatFinanceDate(value: string, format: DateFormat): string {
  const [year, month, day] = value.split("-");
  switch (format) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
  }
}

function validRate(value: unknown): value is {
  date: string;
  rate: number;
} {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    typeof row.rate === "number" &&
    Number.isFinite(row.rate) &&
    row.rate > 0
  );
}

async function fetchHistoricalSeries(
  from: string,
  to: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, number>> {
  const key = `${from}:${to}:${startDate}:${endDate}`;
  let pending = rateCache.get(key);
  if (!pending) {
    pending = (async () => {
      const query = new URLSearchParams({
        base: from,
        quotes: to,
        from: startDate,
        to: endDate,
      });
      const response = await fetch(
        `https://api.frankfurter.dev/v2/rates?${query.toString()}`,
      );
      if (!response.ok) {
        throw new Error(
          `Historical exchange rates are unavailable (${response.status}).`,
        );
      }
      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || !payload.every(validRate)) {
        throw new Error(
          "The exchange-rate service returned invalid historical data.",
        );
      }
      return new Map(payload.map((row) => [row.date, row.rate]));
    })();
    rateCache.set(key, pending);
    pending.catch(() => rateCache.delete(key));
  }
  return pending;
}

export async function getHistoricalExchangeRates(
  from: string,
  to: string,
  dates: string[],
): Promise<Map<string, { rate: number; rateDate: string }>> {
  const uniqueDates = [...new Set(dates)].sort();
  if (!uniqueDates.length) return new Map();
  if (from === to) {
    return new Map(
      uniqueDates.map((date) => [date, { rate: 1, rateDate: date }]),
    );
  }
  const earliest = new Date(`${uniqueDates[0]}T00:00:00.000Z`);
  earliest.setUTCDate(earliest.getUTCDate() - 10);
  const series = await fetchHistoricalSeries(
    from,
    to,
    earliest.toISOString().slice(0, 10),
    uniqueDates.at(-1)!,
  );
  const sortedRates = [...series].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return new Map(
    uniqueDates.map((date) => {
      const applicable = sortedRates
        .filter(([rateDate]) => rateDate <= date)
        .at(-1);
      if (!applicable) {
        throw new Error(
          `No ${from} to ${to} exchange rate is available on or before ${date}.`,
        );
      }
      return [date, { rate: applicable[1], rateDate: applicable[0] }];
    }),
  );
}

export async function getHistoricalExchangeRate(
  from: string,
  to: string,
  date: string,
): Promise<{ rate: number; rateDate: string }> {
  const rates = await getHistoricalExchangeRates(from, to, [date]);
  return rates.get(date)!;
}

export async function getLatestExchangeRate(
  from: string,
  to: string,
): Promise<{ rate: number; rateDate: string }> {
  if (from === to) {
    return { rate: 1, rateDate: new Date().toISOString().slice(0, 10) };
  }
  const key = `latest:${from}:${to}`;
  let pending = rateCache.get(key);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(
        `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from.toLowerCase())}/${encodeURIComponent(to.toLowerCase())}`,
      );
      if (!response.ok) {
        throw new Error(
          `The latest ${from} to ${to} exchange rate is unavailable.`,
        );
      }
      const payload: unknown = await response.json();
      if (!validRate(payload)) {
        throw new Error("The exchange-rate service returned invalid data.");
      }
      return new Map([[payload.date, payload.rate]]);
    })();
    rateCache.set(key, pending);
    pending.catch(() => rateCache.delete(key));
  }
  const rates = await pending;
  const [rateDate, rate] = [...rates.entries()][0];
  return { rate, rateDate };
}

export function convertMinorUnits(amountMinor: number, rate: number): number {
  const converted = Math.round(amountMinor * rate);
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isSafeInteger(converted) ||
    converted <= 0
  ) {
    throw new Error("The converted amount exceeds the supported precision.");
  }
  return converted;
}
