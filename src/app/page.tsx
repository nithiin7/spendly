import { AppShell } from "@/components/layout/app-shell";
import { FinanceDashboard } from "@/components/dashboard/finance-dashboard";

export default function Home() {
  return (
    <AppShell>
      <FinanceDashboard />
    </AppShell>
  );
}
