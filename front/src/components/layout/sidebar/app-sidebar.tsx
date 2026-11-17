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
  Users,
  ShieldCheck,
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

  const isAdmin = user?.is_staff || user?.is_superuser

  const mainItems: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
    { title: "Tutoriais", url: "/tutoriais", icon: GraduationCap },
    { title: "Manuais", url: "/manuais", icon: BookText },
    { title: "Cursos", url: "/cursos", icon: Video },
    { title: "Fale com Alice", url: "/alice", icon: Bot },
    { title: "Validar certificado", url: "/validar-certificado", icon: ShieldCheck },
    { title: "Ajuda", url: "/ajuda", icon: HelpCircle },
  ]

  const adminItems: NavItem[] = [
    { title: "Empresa emissora", url: "/empresa-emissora", icon: Building2 },
    { title: "Tags", url: "/tags", icon: Tag },
    { title: "Setores", url: "/setores", icon: Building2 },
    ...(user?.is_superuser ? [{ title: "Usuários", url: "/usuarios", icon: Users }] : []),
  ]

  if (!user) return null

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center px-4 border-b border-sidebar-border group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-7 items-center justify-center rounded-md shrink-0" style={{ background: "#5e6ad2" }}>
              <BookOpen className="size-3.5 text-white" />
            </div>
            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold" style={{ letterSpacing: "-0.2px" }}>InstructAI</span>
              <span className="truncate text-[10.5px] text-muted-foreground">Gestão de Conhecimento</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={mainItems} label="Geral" />
        {isAdmin && <NavMain items={adminItems} label="Administração" />}
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
