"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"

const capitalize = (s: string) => {
  if (typeof s !== "string" || s.length === 0) {
    return ""
  }
  const decodedString = decodeURIComponent(s)
  return (
    decodedString.charAt(0).toUpperCase() +
    decodedString.slice(1).replace(/-/g, " ")
  )
}

function DynamicBreadcrumbComponent() {
  const pathname = usePathname()
  const pathSegments = React.useMemo(
    () => pathname.split("/").filter((segment) => segment),
    [pathname]
  )

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join("/")}`
          const isLast = index === pathSegments.length - 1

          return (
            <React.Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{capitalize(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>
                    {capitalize(segment)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

// Exportar o componente memoizado para evitar re-renders desnecessários
export const DynamicBreadcrumb = React.memo(DynamicBreadcrumbComponent)
