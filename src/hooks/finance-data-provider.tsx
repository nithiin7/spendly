"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useFinanceDataState } from "@/hooks/use-finance-data";

type FinanceDataContextValue = ReturnType<typeof useFinanceDataState>;

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const finance = useFinanceDataState();
  return (
    <FinanceDataContext.Provider value={finance}>
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData(): FinanceDataContextValue {
  const finance = useContext(FinanceDataContext);
  if (!finance) {
    throw new Error("useFinanceData must be used within FinanceDataProvider.");
  }
  return finance;
}
