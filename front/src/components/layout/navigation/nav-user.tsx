"use client"

import { useState } from "react"
import { Award, BadgeCheck, ChevronsUpDown, Lock, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthContext } from "@/contexts/AuthContext"
import { UserProfileForm } from "@/components/forms/UserProfileForm"
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm"
import { useRouter } from "next/navigation"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout } = useAuthContext()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)

  const getInitials = (name: string) => {
    const words = name.trim().split(" ")
    if (words.length === 1) return words[0][0].toUpperCase()
    return words[0][0].toUpperCase() + words[words.length - 1][0].toUpperCase()
  }

  const capitalizeFirstLetter = (name: string) => {
    if (!name) return name
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="bg-sidebar-accent/50 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-colors duration-150"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {capitalizeFirstLetter(user.name)}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {capitalizeFirstLetter(user.name)}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setTimeout(() => setIsProfileOpen(true), 0)
                  }}
                  className="cursor-pointer"
                >
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Minha Conta
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setTimeout(() => setIsPasswordOpen(true), 0)
                  }}
                  className="cursor-pointer"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/certificados')}
                  className="cursor-pointer"
                >
                  <Award className="mr-2 h-4 w-4" />
                  Meus Certificados
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <UserProfileForm isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <ChangePasswordForm isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />
    </>
  )
}
