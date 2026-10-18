import type { Metadata } from "next"

import { UserSupport } from "@/components/admin/user-support"

export const metadata: Metadata = {
  title: "Users & support",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminUsersPage() {
  return <UserSupport />
}
