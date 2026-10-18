"use client"

import { toast } from "sonner"

import { clearSampleData } from "@/lib/store"

export function clearSampleDataWithUndo() {
  const undo = clearSampleData()
  toast.success("Sample data cleared", {
    description: "Your own bookings and settings are untouched.",
    duration: 8000,
    action: {
      label: "Undo",
      onClick: () => {
        undo()
        toast.success("Sample data restored")
      },
    },
  })
}
