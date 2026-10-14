"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomDropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function CustomDropdown({
  value,
  options,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = "form-input",
  id,
}: CustomDropdownProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef("");
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const enabledOptions = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !option.disabled);

  useEffect(
    () => () => {
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !listboxRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
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
    const menu = listboxRef.current;
    if (!trigger || !menu) return;
    const target = portalTarget;
    const anchor = trigger;
    const menuElement = menu;

    function positionMenu() {
      const dialog =
        target instanceof HTMLDialogElement ? target : target.closest("dialog");
      const bounds = dialog?.getBoundingClientRect();
      const triggerBounds = anchor.getBoundingClientRect();
      const menuBounds = menuElement.getBoundingClientRect();
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
      const height = Math.min(
        menuBounds.height,
        Math.max(100, boundaryBottom - boundaryTop),
      );
      const width = Math.min(
        Math.max(triggerBounds.width, menuBounds.width),
        boundaryRight - boundaryLeft,
      );
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
      setMenuStyle({ left, top, width, maxHeight: height });
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    document.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      document.removeEventListener("scroll", positionMenu, true);
    };
  }, [isOpen, portalTarget, options.length]);

  useEffect(() => {
    if (activeIndex < 0) return;
    listboxRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(`${listboxId}-${activeIndex}`)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  function openMenu(initialIndex = selectedIndex) {
    const firstEnabled = enabledOptions[0]?.index ?? -1;
    const nextIndex =
      initialIndex >= 0 && !options[initialIndex]?.disabled
        ? initialIndex
        : firstEnabled;
    setActiveIndex(nextIndex);
    setPortalTarget(rootRef.current?.closest("dialog") ?? document.body);
    setMenuStyle(null);
    setIsOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentPosition = enabledOptions.findIndex(
      ({ index }) => index === activeIndex,
    );
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu(selectedIndex >= 0 ? selectedIndex : enabledOptions[0]?.index);
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextPosition =
        currentPosition < 0
          ? direction > 0
            ? 0
            : enabledOptions.length - 1
          : (currentPosition + direction + enabledOptions.length) %
            enabledOptions.length;
      setActiveIndex(enabledOptions[nextPosition]?.index ?? -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!isOpen) return;
      event.preventDefault();
      setActiveIndex(
        event.key === "Home"
          ? (enabledOptions[0]?.index ?? -1)
          : (enabledOptions.at(-1)?.index ?? -1),
      );
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) choose(activeIndex);
      else openMenu();
      return;
    }
    if (event.key === "Tab" && isOpen) {
      setIsOpen(false);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      typeaheadRef.current += event.key.toLocaleLowerCase();
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = setTimeout(() => {
        typeaheadRef.current = "";
      }, 500);
      const startAt = Math.max(currentPosition, 0);
      const matches = [
        ...enabledOptions.slice(startAt + 1),
        ...enabledOptions.slice(0, startAt + 1),
      ];
      const match = matches.find(({ option }) =>
        option.label.toLocaleLowerCase().startsWith(typeaheadRef.current),
      );
      if (match) {
        if (!isOpen) openMenu(match.index);
        else setActiveIndex(match.index);
      }
    }
  }

  const menu = isOpen && portalTarget
    ? createPortal(
        <div
          aria-label="Options"
          className="fixed z-100 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-xl"
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          style={{
            ...menuStyle,
            visibility: menuStyle ? "visible" : "hidden",
          }}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;
            return (
              <div
                aria-disabled={option.disabled || undefined}
                aria-selected={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "bg-sage-100 font-medium text-forest-800"
                    : active
                      ? "bg-canvas text-ink"
                      : "text-ink hover:bg-canvas"
                } disabled:cursor-not-allowed disabled:opacity-45`}
                id={`${listboxId}-${index}`}
                key={`${option.value}-${index}`}
                onClick={() => choose(index)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                tabIndex={-1}
              >
                <span>{option.label}</span>
                {selected && <Check aria-hidden="true" className="size-4" />}
              </div>
            );
          })}
        </div>,
        portalTarget,
      )
    : null;

  return (
    <div className="relative w-full min-w-0" ref={rootRef}>
      <button
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required || undefined}
        className={`${className} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50`}
        disabled={disabled}
        id={id}
        onClick={() => {
          if (isOpen) setIsOpen(false);
          else openMenu();
        }}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className="min-w-0 truncate">
          {selectedOption?.label ?? placeholder ?? ""}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {required && (
        <input
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px opacity-0"
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          required
          tabIndex={-1}
          value={value}
        />
      )}
      {menu}
    </div>
  );
}
