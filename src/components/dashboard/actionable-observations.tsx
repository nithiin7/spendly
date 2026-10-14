"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { ActionableObservation as Observation } from "@/lib/actionable-observations";

const kindLabels: Record<Observation["kind"], string> = {
  "budget-overrun": "Over plan",
  "recurring-increase": "Recurring cost",
  "category-increase": "Category increase",
};

export function ActionableObservations({
  observations,
  monthLabel,
}: {
  observations: Observation[];
  monthLabel: string;
}) {
  return (
    <section
      aria-labelledby="actionable-observations-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
    >
      <div>
        <h3
          className="text-base font-semibold tracking-[-0.02em] text-ink"
          id="actionable-observations-heading"
        >
          Actionable observations — {monthLabel}
        </h3>
        <p className="mt-1 text-sm text-muted">
          Notable changes with the amounts and comparisons behind each finding.
        </p>
      </div>

      {observations.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {observations.map((observation) => (
            <li
              className="flex flex-col gap-3 rounded-xl border border-border bg-canvas/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={observation.id}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-forest-800">
                  <Lightbulb aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-ink">
                      {observation.title}
                    </h4>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-muted">
                      {kindLabels[observation.kind]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {observation.description}
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-forest-800 hover:text-forest-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 sm:self-center"
                href={observation.href}
              >
                {observation.actionLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-border bg-canvas/40 px-4 py-8 text-center text-sm text-muted">
          No notable increases or budget overruns were found for {monthLabel}.
          Category increases are highlighted at 20% or more month over month.
        </p>
      )}
    </section>
  );
}
