export type Role = "learner" | "mentor" | "reviewer" | "admin"

// The only mentor workspace in this demo; a real build would map the account to its own mentor profile.
export const DEMO_MENTOR_SLUG = "tanvir-rahman"

export type Actor = { role: Role; mentorSlug?: string }

export const actorFor = (role: Role): Actor => (role === "mentor" ? { role, mentorSlug: DEMO_MENTOR_SLUG } : { role })

export const canManageMentor = (actor: Actor | null | undefined, mentorSlug: string) => actor?.role === "mentor" && actor.mentorSlug === mentorSlug

export const FORBIDDEN = "Only the mentor who owns this can do that."

// Who is acting on an application: the signed-in account's role and email.
export type Principal = { role: Role; email: string }

// Administration is a separate role from reviewing. Every admin domain function re-checks it, so hiding a
// button is never the only guard. Server-side enforcement would live beside these checks in a real build.
export const isAdmin = (principal: Principal | null | undefined): principal is Principal => principal?.role === "admin"

// Reviewing applications is open to the review desk and to administrators, who can also moderate the marketplace.
// Annotated as a plain boolean (not a type predicate) so callers don't accidentally narrow away their principal.
export const canReviewApplications = (principal: Principal | null | undefined): boolean => principal?.role === "reviewer" || isAdmin(principal)

export const ADMIN_FORBIDDEN = "Only an administrator can do that."
