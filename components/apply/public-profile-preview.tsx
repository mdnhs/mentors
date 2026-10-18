import { MapPinIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { VerificationList } from "@/components/mentors/verification-list"
import { getCategory, offerTypeLabels } from "@/lib/categories"
import type { PublicProfile } from "@/lib/mentor-application"
import { verificationSummary } from "@/lib/verification"

// Renders only the public-safe projection, so nothing private can reach this screen.
export function PublicProfilePreview({ profile }: { profile: PublicProfile }) {
  return (
    <div className="surface p-5 shadow-card" aria-label="Public profile preview">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">How your public profile will look</p>
      <div className="mt-4 flex items-center gap-4">
        <MentorAvatar name={profile.name} className="size-16" />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{profile.name}</h3>
          <p className="text-sm">{profile.role}</p>
          <p className="text-sm text-muted-foreground">{profile.organization}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
          {profile.location}
        </li>
        <li>{profile.yearsOfExperience} years of experience · {profile.education}</li>
        <li className="font-medium text-foreground">{verificationSummary(profile.verification)}</li>
      </ul>
      <p className="mt-4 text-sm">{profile.bio}</p>
      <p className="mt-3 text-sm text-muted-foreground">Helps: {profile.audience}</p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Areas and skills">
        {profile.categories.map((id) => (
          <li key={id} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            {getCategory(id).label}
          </li>
        ))}
        {profile.skills.map((skill) => (
          <li key={skill} className="rounded-lg bg-muted px-2.5 py-1 text-xs">
            {skill}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Offers: {profile.offerTypes.map((type) => offerTypeLabels[type]).join(", ")}</p>
      <div className="mt-6 border-t pt-5">
        <VerificationList verification={profile.verification} headingId="preview-verification" />
      </div>
    </div>
  )
}
