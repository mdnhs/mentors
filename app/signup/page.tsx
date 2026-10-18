import type { Metadata } from "next"
import { Suspense } from "react"

import { SignupForm } from "@/components/auth/signup-form"
import { LogoMark } from "@/components/site/logo"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a MentorBridge account to book mentors or apply to mentor.",
}

export default function SignupPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
      <LogoMark className="size-10" />
      <h1 className="mt-6 text-heading">Create your account</h1>
      <p className="mt-1 text-muted-foreground">Join {site.name} to book mentors or share what you know.</p>
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  )
}
