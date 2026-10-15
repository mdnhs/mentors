"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckIcon, Loader2Icon } from "lucide-react"

import { FilterSelect } from "@/components/filters/filter-select"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const areaOptions = [
  { value: "tech", label: "Tech career" },
  { value: "education", label: "Higher education" },
  { value: "both", label: "Both" },
]

export function MentorApplication() {
  const [area, setArea] = useState("tech")
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle")

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("submitting")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setStatus("done")
  }

  if (status === "done") {
    return (
      <div className="surface p-6 text-center shadow-card" role="status">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckIcon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-subheading">Application received</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          In the live product our team would verify your profile next. This demo doesn&apos;t send your details anywhere.
        </p>
        <Link href="/dashboard/mentor" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          Preview the mentor dashboard
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 surface p-5 shadow-card sm:p-6">
      <h2 className="text-subheading">Apply to mentor</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="apply-name">Full name</Label>
          <Input id="apply-name" autoComplete="name" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="apply-email">Email</Label>
          <Input id="apply-email" type="email" autoComplete="email" required />
        </div>
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium" aria-hidden="true">
          I can help with
        </span>
        <FilterSelect label="I can help with" value={area} options={areaOptions} onChange={setArea} className="w-full" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="apply-profile">LinkedIn or portfolio</Label>
        <Input id="apply-profile" type="url" inputMode="url" placeholder="https://" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="apply-about">What have you done that others want to learn?</Label>
        <Textarea id="apply-about" rows={3} required placeholder="E.g. Moved from Dhaka to a backend role in Berlin." />
      </div>
      <Button type="submit" size="lg" disabled={status === "submitting"}>
        {status === "submitting" && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {status === "submitting" ? "Sending…" : "Submit application"}
      </Button>
    </form>
  )
}
