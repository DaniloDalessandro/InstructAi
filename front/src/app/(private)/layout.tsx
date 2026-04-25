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
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4 opacity-30"
            />
            <DynamicBreadcrumb />
          </header>
          <main className="flex-1 px-5 py-6 md:px-7 animate-fade-in">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </DataRefreshProvider>
  )
}
