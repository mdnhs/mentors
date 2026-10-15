import type { Metadata, Viewport } from "next"
import { Hind_Siliguri } from "next/font/google"
import localFont from "next/font/local"

import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { site } from "@/lib/site"
import "./globals.css"

const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
})

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: `${site.name} · Mentorship for your next big step`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
}

export const viewport: Viewport = {
  themeColor: "#fafaf8",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${satoshi.variable} ${hindSiliguri.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col has-data-[mobile-bar]:max-lg:pb-20">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
