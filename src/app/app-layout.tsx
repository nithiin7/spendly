import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FinanceDataProvider } from "@/hooks/finance-data-provider";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <FinanceDataProvider>
      <AppShell>{children}</AppShell>
    </FinanceDataProvider>
  );
}
