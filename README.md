# MentorBridge

A mentorship marketplace for Bangladeshi students and young professionals, built with Next.js 16, Tailwind CSS v4 and shadcn/ui. This build runs on sample data; bookings and saved mentors are stored in the browser only.

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

## Sample data

Mentors, sessions, reviews and demo bookings live in `lib/data/`. Profiles are fictional; portraits are Unsplash photos credited in `public/images/CREDITS.md`.
