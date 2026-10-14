import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-7" id="overview">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-100 px-2.5 py-1 text-[11px] font-semibold text-forest-800">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-positive"
              />
              Sample dashboard
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.045em] text-ink sm:text-[30px]">
              Good morning, Jordan
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Here&apos;s your financial snapshot for October.
            </p>
          </div>
          <p className="pb-1 text-xs text-muted">Example figures · USD</p>
        </div>

        <section
          aria-label="Monthly financial summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SummaryCard
            icon={CreditCard}
            label="Total balance"
            note="Across your tracked accounts"
            value="$12,480.50"
          />
          <SummaryCard
            icon={ArrowDownToLine}
            label="Income this month"
            note="Salary and other income"
            value="$5,200.00"
          />
          <SummaryCard
            icon={ArrowUpFromLine}
            label="Spent this month"
            note="41% of monthly income"
            value="$2,140.00"
          />
          <SummaryCard
            icon={PiggyBank}
            label="Saved this month"
            note="58.8% savings rate"
            tone="positive"
            value="$3,060.00"
          />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <SpendingChart />
          <CategoryBreakdown />
        </div>

        <RecentTransactions />
      </div>
    </AppShell>
  );
}
