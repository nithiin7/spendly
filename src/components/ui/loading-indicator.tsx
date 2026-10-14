"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

export function LoadingIndicator({
  label = "Loading Spendly",
}: {
  label?: string;
}) {
  return (
    <div
      aria-label={label}
      className="flex flex-col items-center gap-4"
      role="status"
    >
      <span className="relative flex size-14 items-center justify-center">
        <motion.span
          animate={{ rotate: 360 }}
          className="absolute inset-0 rounded-full border-2 border-sage-200 border-t-forest-700"
          transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
        />
        <span className="flex size-10 items-center justify-center rounded-full bg-sage-100 text-forest-800">
          <Leaf aria-hidden="true" className="size-5" />
        </span>
      </span>
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="sr-only">Please wait</span>
    </div>
  );
}
