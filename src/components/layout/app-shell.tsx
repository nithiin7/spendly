import type { ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-border bg-white px-5 sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium text-muted">Personal finance</p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-[-0.03em] text-ink">
              Your overview
            </h1>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink sm:flex">
            <CalendarDays aria-hidden="true" className="size-4 text-muted" />
            October 2026
            <ChevronDown
              aria-hidden="true"
              className="ml-1 size-3.5 text-muted"
            />
          </div>
          <span className="rounded-full border border-sage-200 bg-sage-100 px-2.5 py-1 text-[11px] font-semibold text-forest-800 sm:hidden">
            Demo
          </span>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
