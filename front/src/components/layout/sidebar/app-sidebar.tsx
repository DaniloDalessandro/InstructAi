"use client"

import * as React from "react"
import {
  Bot,
  BarChart3,
  HelpCircle,
  BookOpen,
  GraduationCap,
  BookText,
  Video,
  Tag,
  Building2,
  type LucideIcon,
} from "lucide-react"
import { useAuthContext } from "@/contexts/AuthContext"
import { NavMain } from "@/components/layout/navigation/nav-main"
import { NavUser } from "@/components/layout/navigation/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
    action?: string
  }[]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthContext()

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: BarChart3,
    },
    {
      title: "Tutoriais",
      url: "/tutoriais",
      icon: GraduationCap,
    },
    {
      title: "Manuais",
      url: "/manuais",
      icon: BookText,
    },
    {
      title: "Cursos",
      url: "/cursos",
      icon: Video,
    },
    {
      title: "Tags",
      url: "/tags",
      icon: Tag,
    },
    {
      title: "Setores",
      url: "/setores",
      icon: Building2,
    },
    {
      title: "Fale com Alice",
      url: "/alice",
      icon: Bot,
    },
    {
      title: "Ajuda",
      url: "/ajuda",
      icon: HelpCircle,
    },
  ]

  if (!user) return null

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-7 items-center justify-center rounded-md shrink-0" style={{ background: "#5e6ad2" }}>
              <BookOpen className="size-3.5 text-white" />
            </div>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold" style={{ letterSpacing: "-0.2px" }}>InstructAI</span>
              <span className="truncate text-[10.5px] text-muted-foreground">Gestão de Conhecimento</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: (user.name || user.email.split("@")[0]).replace(/^Employee\s+/i, ""),
            email: user.email,
            avatar: user.avatar || "/avatars/default.svg",
          }}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
