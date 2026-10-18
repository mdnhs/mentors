import { PortalShell } from "@/components/portal/portal-shell"

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <PortalShell>{children}</PortalShell>
}
