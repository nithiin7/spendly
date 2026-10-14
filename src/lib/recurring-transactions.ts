import type {
  FinanceData,
  RecurringOccurrence,
  RecurringRule,
  RecurringRuleInput,
} from "@/types/finance";
import { createTransactionRecord } from "./transaction-factory.ts";

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dayInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function monthDate(year: number, monthIndex: number, desiredDay: number): string {
  const normalizedYear = year + Math.floor(monthIndex / 12);
  const normalizedMonth = ((monthIndex % 12) + 12) % 12;
  if (normalizedYear < 1000 || normalizedYear > 9999) {
    throw new Error("The recurring schedule exceeds the supported date range.");
  }
  const day = Math.min(desiredDay, dayInMonth(normalizedYear, normalizedMonth));
  return `${normalizedYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  const next = value.toISOString().slice(0, 10);
  if (!isCalendarDate(next)) {
    throw new Error("The recurring schedule exceeds the supported date range.");
  }
  return next;
}

export function getNextRecurringDate(
  rule: Pick<RecurringRule, "frequency" | "interval" | "startDate">,
  scheduledDate: string,
): string {
  if (!isCalendarDate(scheduledDate) || !isCalendarDate(rule.startDate)) {
    throw new Error("Recurring dates must be valid calendar dates.");
  }
  switch (rule.frequency) {
    case "weekly":
      return addDays(scheduledDate, 7);
    case "custom":
      if (!Number.isInteger(rule.interval) || (rule.interval ?? 0) < 1) {
        throw new Error("A custom schedule needs an interval of at least one day.");
      }
      return addDays(scheduledDate, rule.interval!);
    case "monthly":
    case "quarterly":
    case "yearly": {
      const currentYear = Number(scheduledDate.slice(0, 4));
      const currentMonth = Number(scheduledDate.slice(5, 7)) - 1;
      const monthStep =
        rule.frequency === "monthly"
          ? 1
          : rule.frequency === "quarterly"
            ? 3
            : 12;
      return monthDate(
        currentYear,
        currentMonth + monthStep,
        Number(rule.startDate.slice(8, 10)),
      );
    }
  }
}

export function createRecurringOccurrence(
  rule: RecurringRule,
  scheduledDate = rule.nextDueDate,
  now = new Date().toISOString(),
): RecurringOccurrence {
  return {
    id: `${rule.id}::${scheduledDate}`,
    ruleId: rule.id,
    scheduledDate,
    date: scheduledDate,
    description: rule.description,
    type: rule.type,
    amountPaise: rule.amountPaise,
    categoryId: rule.categoryId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

export function isRecurringRule(value: unknown): value is RecurringRule {
  if (typeof value !== "object" || value === null) return false;
  const rule = value as Record<string, unknown>;
  return (
    typeof rule.id === "string" &&
    rule.id.trim().length > 0 &&
    typeof rule.description === "string" &&
    rule.description.trim().length > 0 &&
    (rule.type === "income" || rule.type === "expense") &&
    Number.isSafeInteger(rule.amountPaise) &&
    Number(rule.amountPaise) > 0 &&
    typeof rule.categoryId === "string" &&
    (rule.frequency === "weekly" ||
      rule.frequency === "monthly" ||
      rule.frequency === "quarterly" ||
      rule.frequency === "yearly" ||
      rule.frequency === "custom") &&
    (rule.frequency === "custom"
      ? Number.isInteger(rule.interval) &&
        Number(rule.interval) >= 1 &&
        Number(rule.interval) <= 36500
      : rule.interval === undefined) &&
    typeof rule.startDate === "string" &&
    isCalendarDate(rule.startDate) &&
    typeof rule.nextDueDate === "string" &&
    isCalendarDate(rule.nextDueDate) &&
    rule.nextDueDate >= rule.startDate &&
    (rule.endDate === undefined ||
      (typeof rule.endDate === "string" &&
        isCalendarDate(rule.endDate) &&
        rule.endDate >= rule.startDate)) &&
    typeof rule.active === "boolean" &&
    (rule.notes === undefined || typeof rule.notes === "string") &&
    typeof rule.createdAt === "string" &&
    Number.isFinite(Date.parse(rule.createdAt)) &&
    typeof rule.updatedAt === "string" &&
    Number.isFinite(Date.parse(rule.updatedAt))
  );
}

export function isRecurringOccurrence(
  value: unknown,
): value is RecurringOccurrence {
  if (typeof value !== "object" || value === null) return false;
  const occurrence = value as Record<string, unknown>;
  return (
    typeof occurrence.id === "string" &&
    occurrence.id.trim().length > 0 &&
    (occurrence.ruleId === null ||
      (typeof occurrence.ruleId === "string" &&
        occurrence.ruleId.trim().length > 0)) &&
    typeof occurrence.scheduledDate === "string" &&
    isCalendarDate(occurrence.scheduledDate) &&
    typeof occurrence.date === "string" &&
    isCalendarDate(occurrence.date) &&
    typeof occurrence.description === "string" &&
    occurrence.description.trim().length > 0 &&
    (occurrence.type === "income" || occurrence.type === "expense") &&
    Number.isSafeInteger(occurrence.amountPaise) &&
    Number(occurrence.amountPaise) > 0 &&
    typeof occurrence.categoryId === "string" &&
    (occurrence.status === "pending" ||
      occurrence.status === "confirmed" ||
      occurrence.status === "skipped") &&
    (occurrence.transactionId === undefined ||
      (typeof occurrence.transactionId === "string" &&
        occurrence.transactionId.length > 0)) &&
    typeof occurrence.createdAt === "string" &&
    Number.isFinite(Date.parse(occurrence.createdAt)) &&
    typeof occurrence.updatedAt === "string" &&
    Number.isFinite(Date.parse(occurrence.updatedAt)) &&
    (occurrence.status === "confirmed"
      ? occurrence.transactionId === undefined ||
        typeof occurrence.transactionId === "string"
      : occurrence.transactionId === undefined)
  );
}

export function validateRecurringRuleInput(
  input: RecurringRuleInput,
  categories: { id: string; type: string }[],
): string | null {
  if (!input.description.trim()) return "Enter a description for this schedule.";
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) {
    return "Enter an amount greater than ₹0.";
  }
  if (
    !categories.some(
      (category) =>
        category.id === input.categoryId && category.type === input.type,
    )
  ) {
    return "Choose a category that matches the income or expense type.";
  }
  if (!isCalendarDate(input.startDate) || !isCalendarDate(input.nextDueDate)) {
    return "Choose valid start and next due dates.";
  }
  if (input.nextDueDate < input.startDate) {
    return "The next due date cannot be before the start date.";
  }
  if (
    input.endDate !== undefined &&
    (!isCalendarDate(input.endDate) ||
      input.endDate < input.startDate ||
      input.nextDueDate > input.endDate)
  ) {
    return "The end date must be on or after the start and next due dates.";
  }
  if (
    input.frequency === "custom" &&
    (!Number.isInteger(input.interval) ||
      input.interval! < 1 ||
      input.interval! > 36500)
  ) {
    return "Enter a custom interval between 1 and 36,500 days.";
  }
  if (input.frequency !== "custom" && input.interval !== undefined) {
    return "Only custom schedules can have a day interval.";
  }
  return null;
}

export function settleRecurringOccurrence(
  data: FinanceData,
  occurrenceId: string,
  status: "confirmed" | "skipped",
  now = new Date().toISOString(),
): FinanceData {
  const occurrence = data.recurringOccurrences.find(
    (item) => item.id === occurrenceId,
  );
  if (!occurrence) throw new Error("This recurring occurrence no longer exists.");
  if (occurrence.status !== "pending") return data;
  const rule = data.recurringRules.find((item) => item.id === occurrence.ruleId);
  if (!rule) throw new Error("This occurrence no longer has a recurring schedule.");

  const transactionId = `recurring-occurrence::${occurrence.id}`;
  if (
    status === "confirmed" &&
    data.transactions.some((transaction) => transaction.id === transactionId)
  ) {
    throw new Error(
      "A transaction already exists for this occurrence. It was not duplicated.",
    );
  }

  const nextDueDate = getNextRecurringDate(rule, occurrence.scheduledDate);
  const hasReachedEnd = Boolean(rule.endDate && nextDueDate > rule.endDate);
  const updatedRule = {
    ...rule,
    nextDueDate,
    active: hasReachedEnd ? false : rule.active,
    updatedAt: now,
  };
  const nextOccurrenceId = `${rule.id}::${nextDueDate}`;
  const existingNextOccurrence = data.recurringOccurrences.find(
    (item) => item.id === nextOccurrenceId,
  );
  if (existingNextOccurrence?.status !== undefined && existingNextOccurrence.status !== "pending") {
    throw new Error(
      "A completed occurrence already exists for the next scheduled date.",
    );
  }
  const updatedOccurrence: RecurringOccurrence = {
    ...occurrence,
    status,
    ...(status === "confirmed" ? { transactionId } : {}),
    updatedAt: now,
  };
  const transaction =
    status === "confirmed"
      ? createTransactionRecord(
          {
            type: occurrence.type,
            description: occurrence.description,
            amountPaise: occurrence.amountPaise,
            categoryId: occurrence.categoryId,
            categorySource: "manual",
            date: occurrence.date,
            ...(rule.notes ? { notes: rule.notes } : {}),
          },
          transactionId,
          now,
        )
      : null;
  const nextOccurrence =
    rule.active && !hasReachedEnd && !existingNextOccurrence
      ? createRecurringOccurrence(updatedRule, nextDueDate, now)
      : null;

  return {
    ...data,
    transactions: transaction
      ? [transaction, ...data.transactions]
      : data.transactions,
    recurringRules: data.recurringRules.map((item) =>
      item.id === rule.id ? updatedRule : item,
    ),
    recurringOccurrences: [
      ...(nextOccurrence ? [nextOccurrence] : []),
      ...data.recurringOccurrences.map((item) =>
        item.id === occurrence.id ? updatedOccurrence : item,
      ),
    ],
  };
}

export function updatePendingOccurrence(
  data: FinanceData,
  occurrenceId: string,
  input: { amountPaise: number; date: string },
  now = new Date().toISOString(),
): FinanceData {
  const occurrence = data.recurringOccurrences.find(
    (item) => item.id === occurrenceId,
  );
  if (!occurrence || occurrence.status !== "pending") {
    throw new Error("Only a pending occurrence can be edited.");
  }
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new Error("Enter an amount greater than ₹0.");
  }
  if (!isCalendarDate(input.date)) {
    throw new Error("Choose a valid occurrence date.");
  }
  return {
    ...data,
    recurringOccurrences: data.recurringOccurrences.map((item) =>
      item.id === occurrenceId
        ? { ...item, ...input, updatedAt: now }
        : item,
    ),
  };
}
