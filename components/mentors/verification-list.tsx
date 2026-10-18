import { ClockIcon, ShieldCheckIcon } from "lucide-react"

import { checkCopy, checkKinds, verificationDisclaimer, type Verification } from "@/lib/verification"

// Used on public profiles and in the approved-application preview, so both say the same thing.
export function VerificationList({ verification, headingId = "verification" }: { verification: Verification; headingId?: string }) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="scroll-mt-24 text-subheading">
        Verification
      </h2>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2">
        {checkKinds.map((kind) => {
          const done = verification[kind]
          const copy = checkCopy[kind]
          return (
            <li key={kind} className="flex gap-3">
              {done ? <ShieldCheckIcon className="size-5 shrink-0 text-success" aria-hidden="true" /> : <ClockIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div>
                <p className="text-sm font-medium">{done ? copy.done : `${copy.label} not checked yet`}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{done ? copy.detail : copy.pending}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">{verificationDisclaimer}</p>
    </section>
  )
}
