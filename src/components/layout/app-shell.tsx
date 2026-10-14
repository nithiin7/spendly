"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HardDrive } from "lucide-react";
import { useFinanceData } from "@/hooks/finance-data-provider";
import { AppSidebar, pageTitles } from "@/components/layout/app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? pageTitles["/"];
  const finance = useFinanceData();

  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-border bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <AppSidebar mobileTriggerOnly />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Personal finance</p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-[-0.03em] text-ink">
                {title}
              </h1>
            </div>
          </div>
          <div
            aria-live="polite"
            className="hidden items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink sm:flex"
          >
            <HardDrive aria-hidden="true" className="size-4 text-muted" />
            {finance.isSaving
              ? "Saving…"
              : finance.storageMode === "cloud"
                ? "Synced to your account"
                : "Saved in this browser"}
          </div>
        </header>
        {finance.error && (
          <div
            className="mx-auto mt-4 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            <span>{finance.error}</span>
            <button
              className="font-semibold underline underline-offset-2 disabled:opacity-60"
              disabled={finance.isLoading || finance.isSaving}
              onClick={() => void finance.reloadData()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
