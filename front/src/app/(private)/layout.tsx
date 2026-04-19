import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DynamicBreadcrumb } from "@/components/layout/navigation/DynamicBreadcrumb"
import { DataRefreshProvider } from "@/contexts/DataRefreshContext"
import React from "react"

// Layout privado com providers necessários
// DataRefreshProvider: gerencia refresh de dados entre componentes
// SidebarProvider: gerencia estado do sidebar
export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <DataRefreshProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <DynamicBreadcrumb />
          </header>
          <main className="flex-1 px-4 py-6 md:px-6 animate-fade-in">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </DataRefreshProvider>
  )
}
