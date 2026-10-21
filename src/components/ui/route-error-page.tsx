"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function RouteErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-12">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-card sm:p-10"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <AlertTriangle aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
          This page hit a snag
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Your data is still safe. Try loading the page again, or head back to
          your overview.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button className="button-primary" onClick={reset} type="button">
            <RefreshCw aria-hidden="true" className="size-4" />
            Try again
          </button>
          <Link className="button-secondary" href="/">
            Go to overview
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
