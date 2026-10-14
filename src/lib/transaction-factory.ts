import type { Transaction, TransactionInput } from "@/types/finance";

export function createTransactionRecord(
  input: TransactionInput,
  id: string,
  now: string,
): Transaction {
  return { ...input, id, createdAt: now, updatedAt: now };
}
