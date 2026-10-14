import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FinanceDataProvider } from "@/hooks/finance-data-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <FinanceDataProvider>
      <AppShell>{children}</AppShell>
    </FinanceDataProvider>
  );
}
