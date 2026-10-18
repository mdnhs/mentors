import Link from "next/link"
import { Fragment, type ComponentType } from "react"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

export type Crumb = { label: string; href?: string }

export function PageBreadcrumbs({ items, link: LinkComponent = Link, className }: { items: Crumb[]; link?: ComponentType<{ href: string }>; className?: string }) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink render={<LinkComponent href={item.href} />} className="rounded-sm focus-ring">
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="max-w-64 truncate">{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
