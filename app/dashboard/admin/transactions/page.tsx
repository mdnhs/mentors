import type { Metadata } from "next"

import { TransactionLog } from "@/components/admin/transaction-log"

export const metadata: Metadata = {
  title: "Transactions",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminTransactionsPage() {
  return <TransactionLog />
}
