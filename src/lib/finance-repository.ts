import type { FinanceData } from "@/types/finance";

export interface FinanceRepository {
  loadFinanceData(): Promise<FinanceData>;
  persistChanges(previous: FinanceData, next: FinanceData): Promise<void>;
  hasCompletedMigration(migrationId: string): Promise<boolean>;
  recordCompletedMigration(
    migrationId: string,
    entityCounts: Record<string, number>,
  ): Promise<void>;
}
