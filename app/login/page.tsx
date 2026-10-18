import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { LoginForm } from "@/components/auth/login-form"
import { LogoMark } from "@/components/site/logo"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Log in",
}

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
      <LogoMark className="size-10" />
      <h1 className="mt-6 text-heading">Welcome back</h1>
      <p className="mt-1 text-muted-foreground">Log in to manage your sessions on {site.name}.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/mentors" className="link">
          Find a mentor first
        </Link>
      </p>
    </div>
  )
}
