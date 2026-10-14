"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, House } from "lucide-react";

export function NotFoundPage() {
  return (
    <main className="flex min-h-[75vh] items-center justify-center px-5 py-12">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg text-center"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          aria-hidden="true"
          className="text-[clamp(7rem,25vw,12rem)] font-semibold leading-none tracking-[-0.1em] text-sage-200"
        >
          404
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
          Looks like this page wandered off
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
          The link may be outdated, or the page may have moved. Let’s get you back on track.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="button-primary" href="/">
            <House aria-hidden="true" className="size-4" />
            Go to overview
          </Link>
          <button
            className="button-secondary"
            onClick={() => window.history.back()}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Go back
          </button>
        </div>
      </motion.section>
    </main>
  );
}
