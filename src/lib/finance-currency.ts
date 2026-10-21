import type { FinanceData } from "../types/finance.ts";
import { convertMinorUnits, getHistoricalExchangeRates } from "./currency.ts";

type ConversionTask = {
  amountPaise: number;
  originalAmountPaise?: number;
  originalCurrency?: string;
  date: string;
  assign: (
    amountPaise: number,
    sourceAmountPaise: number,
    sourceCurrency: string,
    rateDate: string,
  ) => void;
  clearOriginal: () => void;
};

type CurrencyChangeOptions = {
  fromCurrency: string;
  toCurrency: string;
  preserveOriginalAmounts: boolean;
  onProgress?: (completed: number, total: number) => void;
};

function getBudgetDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export async function convertFinanceDataCurrency(
  data: FinanceData,
  {
    fromCurrency,
    toCurrency,
    preserveOriginalAmounts,
    onProgress,
  }: CurrencyChangeOptions,
): Promise<FinanceData> {
  const next = structuredClone(data);
  const tasks: ConversionTask[] = [];
  const addTask = (
    record: {
      amountPaise: number;
      originalAmountPaise?: number;
      originalCurrency?: string;
      exchangeRateDate?: string;
    },
    date: string,
  ) => {
    tasks.push({
      amountPaise: record.amountPaise,
      originalAmountPaise: record.originalAmountPaise,
      originalCurrency: record.originalCurrency,
      date,
      assign: (amountPaise, sourceAmountPaise, sourceCurrency, rateDate) => {
        record.amountPaise = amountPaise;
        if (preserveOriginalAmounts) {
          record.originalAmountPaise = sourceAmountPaise;
          record.originalCurrency = sourceCurrency;
          record.exchangeRateDate = rateDate;
        } else {
          delete record.originalAmountPaise;
          delete record.originalCurrency;
          delete record.exchangeRateDate;
        }
      },
      clearOriginal: () => {
        delete record.originalAmountPaise;
        delete record.originalCurrency;
        delete record.exchangeRateDate;
      },
    });
  };

  for (const transaction of next.transactions) {
    addTask(transaction, transaction.date);
  }
  for (const rule of next.recurringRules) {
    addTask(rule, rule.startDate);
  }
  for (const occurrence of next.recurringOccurrences) {
    addTask(occurrence, occurrence.date);
  }
  for (const budget of next.budgets) {
    const date = getBudgetDate(budget.year, budget.month);
    if (budget.overallLimitPaise !== undefined) {
      const wrapper = {
        amountPaise: budget.overallLimitPaise,
        originalAmountPaise: budget.originalOverallLimitPaise,
        originalCurrency: budget.originalCurrency,
        exchangeRateDate: budget.exchangeRateDate,
      };
      addTask(wrapper, date);
      const task = tasks.at(-1)!;
      tasks[tasks.length - 1] = {
        ...task,
        assign: (amountPaise, sourceAmount, sourceCurrency, rateDate) => {
          budget.overallLimitPaise = amountPaise;
          if (preserveOriginalAmounts) {
            budget.originalOverallLimitPaise = sourceAmount;
            budget.originalCurrency = sourceCurrency;
            budget.exchangeRateDate = rateDate;
          } else {
            delete budget.originalOverallLimitPaise;
            delete budget.originalCurrency;
            delete budget.exchangeRateDate;
          }
        },
        clearOriginal: () => {
          delete budget.originalOverallLimitPaise;
          delete budget.originalCurrency;
          delete budget.exchangeRateDate;
        },
      };
    }
    for (const allocation of budget.allocations) {
      addTask(allocation, date);
    }
  }

  const datesByCurrency = new Map<string, Set<string>>();
  let completed = 0;
  for (const task of tasks) {
    const sourceCurrency = task.originalCurrency ?? fromCurrency;
    if (sourceCurrency === toCurrency) continue;
    const dates = datesByCurrency.get(sourceCurrency) ?? new Set<string>();
    dates.add(task.date);
    datesByCurrency.set(sourceCurrency, dates);
  }

  const ratesByCurrency = new Map<
    string,
    Map<string, { rate: number; rateDate: string }>
  >();
  await Promise.all(
    [...datesByCurrency].map(async ([sourceCurrency, dates]) => {
      ratesByCurrency.set(
        sourceCurrency,
        await getHistoricalExchangeRates(sourceCurrency, toCurrency, [
          ...dates,
        ]),
      );
    }),
  );

  for (const task of tasks) {
    const sourceCurrency = task.originalCurrency ?? fromCurrency;
    const sourceAmount = task.originalAmountPaise ?? task.amountPaise;
    const rate =
      sourceCurrency === toCurrency
        ? { rate: 1, rateDate: task.date }
        : ratesByCurrency.get(sourceCurrency)?.get(task.date);
    if (!rate) {
      throw new Error(
        `An exchange rate is missing for ${sourceCurrency} on ${task.date}.`,
      );
    }
    task.assign(
      convertMinorUnits(sourceAmount, rate.rate),
      sourceAmount,
      sourceCurrency,
      rate.rateDate,
    );
    onProgress?.(++completed, tasks.length);
  }

  if (!preserveOriginalAmounts) {
    for (const budget of next.budgets) {
      delete budget.originalOverallLimitPaise;
      delete budget.originalCurrency;
      delete budget.exchangeRateDate;
      for (const allocation of budget.allocations) {
        delete allocation.originalAmountPaise;
        delete allocation.originalCurrency;
        delete allocation.exchangeRateDate;
      }
    }
  }

  next.preferences = {
    defaultCurrency: toCurrency,
    dateFormat: data.preferences?.dateFormat ?? "DD/MM/YYYY",
    hideBalances: data.preferences?.hideBalances ?? false,
  };
  return next;
}
