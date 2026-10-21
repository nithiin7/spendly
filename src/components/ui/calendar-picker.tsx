"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { DateFormat } from "@/types/finance";

type CalendarPickerProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: "date" | "month";
  min?: string;
  max?: string;
  clearable?: boolean;
  className?: string;
  id?: string;
  dateFormat?: DateFormat;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(2020, month, 1)),
  ),
);

function parseYearMonth(value: string): [number, number] | null {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return month >= 0 && month < 12 ? [year, month] : null;
}

function formatValue(
  value: string,
  mode: "date" | "month",
  dateFormat: DateFormat,
): string {
  const parts = parseYearMonth(value);
  if (!parts) return mode === "date" ? "Choose a date" : "Choose a month";
  const [year, month] = parts;
  if (mode === "month") {
    return new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month, 1)));
  }
  const day = Number(value.slice(8, 10));
  if (dateFormat === "DD/MM/YYYY") {
    return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
  }
  if (dateFormat === "MM/DD/YYYY") {
    return `${String(month + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthValue(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function CalendarPicker({
  value,
  onChange,
  mode = "date",
  min,
  max,
  clearable = false,
  className = "form-input",
  id,
  dateFormat = "DD/MM/YYYY",
}: CalendarPickerProps) {
  const triggerId = useId();
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const valueParts = parseYearMonth(value);
  const today = new Date();
  const initialParts = valueParts ??
    parseYearMonth(min ?? "") ?? [today.getFullYear(), today.getMonth()];
  const [visibleYear, setVisibleYear] = useState(initialParts[0]);
  const [visibleMonth, setVisibleMonth] = useState(initialParts[1]);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !portalTarget) return;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const anchor = trigger;
    const popoverElement = popover;
    const target = portalTarget;

    function positionPopover() {
      const dialog =
        target instanceof HTMLDialogElement ? target : target.closest("dialog");
      const bounds = dialog?.getBoundingClientRect();
      const triggerBounds = anchor.getBoundingClientRect();
      const popoverBounds = popoverElement.getBoundingClientRect();
      const margin = 12;
      const boundaryTop = Math.max(margin, bounds?.top ?? margin);
      const boundaryBottom = Math.min(
        window.innerHeight - margin,
        bounds?.bottom ?? window.innerHeight - margin,
      );
      const boundaryLeft = Math.max(margin, bounds?.left ?? margin);
      const boundaryRight = Math.min(
        window.innerWidth - margin,
        bounds?.right ?? window.innerWidth - margin,
      );
      const maxHeight = Math.max(120, boundaryBottom - boundaryTop);
      const height = Math.min(popoverBounds.height, maxHeight);
      const width = Math.min(popoverBounds.width, boundaryRight - boundaryLeft);
      const below = boundaryBottom - triggerBounds.bottom - 8;
      const above = triggerBounds.top - boundaryTop - 8;
      const top =
        below >= height || below >= above
          ? Math.min(triggerBounds.bottom + 8, boundaryBottom - height)
          : Math.max(boundaryTop, triggerBounds.top - height - 8);
      const left = Math.max(
        boundaryLeft,
        Math.min(triggerBounds.left, boundaryRight - width),
      );
      setPopoverStyle({ left, top, maxHeight, width });
    }

    positionPopover();
    window.addEventListener("resize", positionPopover);
    document.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      document.removeEventListener("scroll", positionPopover, true);
    };
  }, [isOpen, portalTarget, mode, visibleYear, visibleMonth, clearable, value]);

  function openPicker() {
    const parts = parseYearMonth(value) ??
      parseYearMonth(min ?? "") ?? [today.getFullYear(), today.getMonth()];
    setVisibleYear(parts[0]);
    setVisibleMonth(parts[1]);
    if (!isOpen) {
      setPortalTarget(rootRef.current?.closest("dialog") ?? document.body);
      setPopoverStyle(null);
    }
    setIsOpen((open) => !open);
  }

  function shiftMonth(amount: number) {
    const next = new Date(Date.UTC(visibleYear, visibleMonth + amount, 1));
    setVisibleYear(next.getUTCFullYear());
    setVisibleMonth(next.getUTCMonth());
  }

  const visibleMonthKey = monthValue(visibleYear, visibleMonth);
  const minimumMonth = min ? min.slice(0, 7) : undefined;
  const maximumMonth = max ? max.slice(0, 7) : undefined;
  const canGoPrevious = !minimumMonth || visibleMonthKey > minimumMonth;
  const canGoNext = !maximumMonth || visibleMonthKey < maximumMonth;

  function selectMonth(month: number) {
    onChange(monthValue(visibleYear, month));
    setIsOpen(false);
  }

  function selectDate(day: number) {
    const dateValue = `${visibleMonthKey}-${String(day).padStart(2, "0")}`;
    if ((min && dateValue < min) || (max && dateValue > max)) return;
    onChange(dateValue);
    setIsOpen(false);
  }

  const daysInMonth = new Date(
    Date.UTC(visibleYear, visibleMonth + 1, 0),
  ).getUTCDate();
  const firstWeekday = new Date(
    Date.UTC(visibleYear, visibleMonth, 1),
  ).getUTCDay();
  const selectedMonth = valueParts
    ? monthValue(valueParts[0], valueParts[1])
    : "";
  const selectedDay = value.length > 7 ? Number(value.slice(8, 10)) : 0;
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`${className} flex items-center justify-between gap-2 text-left`}
        id={id ?? triggerId}
        onClick={openPicker}
        ref={triggerRef}
        type="button"
      >
        <span className={value ? "text-ink" : "text-muted"}>
          {formatValue(value, mode, dateFormat)}
        </span>
        <CalendarDays
          aria-hidden="true"
          className="size-4 shrink-0 text-muted"
        />
      </button>

      {isOpen &&
        portalTarget &&
        createPortal(
          <motion.div
            aria-label={mode === "date" ? "Choose a date" : "Choose a month"}
            className="fixed z-100 w-[min(19rem,calc(100vw-3rem))] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-xl"
            id={popoverId}
            role="dialog"
            ref={popoverRef}
            style={{
              ...popoverStyle,
              visibility: popoverStyle ? "visible" : "hidden",
            }}
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                aria-label={
                  mode === "date" ? "Previous month" : "Previous year"
                }
                className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canGoPrevious}
                onClick={() => shiftMonth(mode === "date" ? -1 : -12)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <p className="text-sm font-semibold text-ink">
                {mode === "date"
                  ? new Intl.DateTimeFormat("en-IN", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(Date.UTC(visibleYear, visibleMonth, 1)))
                  : visibleYear}
              </p>
              <button
                aria-label={mode === "date" ? "Next month" : "Next year"}
                className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canGoNext}
                onClick={() => shiftMonth(mode === "date" ? 1 : 12)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>

            {mode === "date" ? (
              <div
                aria-label="Calendar dates"
                className="grid grid-cols-7 gap-1"
              >
                {WEEKDAYS.map((weekday) => (
                  <span
                    aria-label={weekday}
                    className="py-1 text-center text-xs font-medium text-muted"
                    key={weekday}
                  >
                    {weekday.slice(0, 1)}
                  </span>
                ))}
                {Array.from({ length: firstWeekday }, (_, index) => (
                  <span aria-hidden="true" key={`empty-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;
                  const dateValue = `${visibleMonthKey}-${String(day).padStart(2, "0")}`;
                  const disabled =
                    (min !== undefined && dateValue < min) ||
                    (max !== undefined && dateValue > max);
                  const selected =
                    selectedMonth === visibleMonthKey && selectedDay === day;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`flex aspect-square items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 ${
                        selected
                          ? "bg-forest-800 font-semibold text-white"
                          : dateValue === todayString
                            ? "bg-sage-100 font-semibold text-forest-800"
                            : "text-ink hover:bg-sage-100"
                      } disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent`}
                      disabled={disabled}
                      key={dateValue}
                      onClick={() => selectDate(day)}
                      type="button"
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => {
                  const candidate = monthValue(visibleYear, index);
                  const disabled =
                    (minimumMonth !== undefined && candidate < minimumMonth) ||
                    (maximumMonth !== undefined && candidate > maximumMonth);
                  const selected = selectedMonth === candidate;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`rounded-xl px-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 ${
                        selected
                          ? "bg-forest-800 font-semibold text-white"
                          : "text-ink hover:bg-sage-100"
                      } disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent`}
                      disabled={disabled}
                      key={candidate}
                      onClick={() => selectMonth(index)}
                      type="button"
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            )}

            {clearable && value && (
              <button
                className="mt-3 w-full rounded-lg border-t border-border pt-3 text-sm font-medium text-muted transition-colors hover:text-ink"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                type="button"
              >
                Clear date
              </button>
            )}
          </motion.div>,
          portalTarget,
        )}
    </div>
  );
}
