# MentorBridge

A mentorship marketplace for Bangladeshi students and young professionals, built with Next.js 16, Tailwind CSS v4 and shadcn/ui. This build runs on sample data; bookings and saved mentors are stored in the browser only. Booking is a demo: slots are re-checked and written under a browser lock, which stops double-booking across tabs but not across devices.

## Setup

```bash
npm install
npm run dev
```

### Fonts

The UI uses [Satoshi](https://www.fontshare.com/fonts/satoshi) for English and Hind Siliguri (loaded from Google Fonts) for Bangla.

Satoshi's licence allows self-hosting but not redistribution, so the font file is not committed. Before building:

1. Download Satoshi from Fontshare.
2. Copy `Satoshi-Variable.woff2` from the download's `Fonts/WEB/fonts/` folder to `app/fonts/Satoshi-Variable.woff2`.

The build fails if the file is missing.

## Scripts

- `npm run dev` starts the dev server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run test:unit` runs the unit tests (no server needed); `npm test` also runs the browser tests.

## Sample data

Mentors, sessions, reviews and demo bookings live in `lib/data/`. Profiles are fictional; portraits are Unsplash photos credited in `public/images/CREDITS.md`.

## Admin workspace

An admin role opens `/dashboard/admin`: business metrics and operational queues, mentor and offer moderation, booking management, refunds and disputes, payment transactions, mentor payouts, review moderation, user support and account restrictions, and an audit log of sensitive actions.

It is a demo administration desk. Sign-in is simulated, and the moderation overrides, disputes, tickets and audit trail live in this browser's storage. Its actions change nothing real: no payment is taken or refunded, no payout is sent and no account is actually restricted. Records that are made up are marked "Sample", and each screen carries a demo notice.

Authorization is re-checked in the domain layer (`lib/admin.ts` and the store actions) on every mutation, not trusted to the UI. There is no server session, so this is not a real access-control boundary — a production build would place the same checks behind authenticated server routes.
