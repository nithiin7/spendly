"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "default" | "small";
};

export function Modal({
  title,
  description,
  onClose,
  children,
  size = "default",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <motion.dialog
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`m-auto max-h-[min(90vh,760px)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-border bg-white p-0 text-ink shadow-2xl backdrop:bg-forest-950/40 ${
        size === "small" ? "max-w-md" : "max-w-xl"
      }`}
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.03em]" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted" id={descriptionId}>
              {description}
            </p>
          )}
        </div>
        <button
          aria-label="Close dialog"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {children}
    </motion.dialog>
  );
}
