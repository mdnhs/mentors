import type { Metadata } from "next"
import Link from "next/link"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { LogoMark } from "@/components/site/logo"

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Get a link to reset your MentorBridge password.",
}

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
      <LogoMark className="size-10" />
      <h1 className="mt-6 text-heading">Reset your password</h1>
      <p className="mt-1 text-muted-foreground">Enter your account email and we&apos;ll send you a reset link.</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="link">
          Log in
        </Link>
      </p>
    </div>
  )
}
