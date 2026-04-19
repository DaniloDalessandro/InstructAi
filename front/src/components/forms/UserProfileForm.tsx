"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Lock } from "lucide-react"
import { useAuthContext } from "@/contexts/AuthContext"
import { updateProfile } from "@/lib/api/account"
import { toast } from "@/hooks/use-toast"
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm"

interface UserProfileFormProps {
  isOpen: boolean
  onClose: () => void
}

interface UserProfileData {
  name: string
  email: string
  avatar: string
  phone?: string
  position?: string
}

export function UserProfileForm({ isOpen, onClose }: UserProfileFormProps) {
  const { user, updateUser } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [formData, setFormData] = useState<UserProfileData>({
    name: "",
    email: "",
    avatar: "",
    phone: "",
    position: "",
  })

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
        phone: user.phone || "",
        position: user.position || "",
      })
    }
  }, [user, isOpen])

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "U"
    
    const words = name.trim().split(" ").filter(word => word.length > 0)
    if (words.length === 0) return "U"
    if (words.length === 1) {
      return words[0][0].toUpperCase()
    }
    return (
      words[0][0].toUpperCase() + words[words.length - 1][0].toUpperCase()
    )
  }

  const handleInputChange = (field: keyof UserProfileData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const updated = await updateProfile({
        name: formData.name,
        phone: formData.phone,
        position: formData.position,
        avatar: avatarFile,
      })
      updateUser({
        name: updated.name,
        phone: updated.phone,
        position: updated.position,
        avatar: updated.avatar_url || formData.avatar,
      })
      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso!' })
      onClose()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar perfil', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          avatar: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-w-[90vw]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Minha Conta
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Avatar Section — visual mais compacto */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.avatar} alt={formData.name} />
                  <AvatarFallback className="text-base">
                    {getInitials(formData.name)}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div>
                <p className="font-medium text-sm">{formData.name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{formData.email}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  Clique no ícone para alterar a foto
                </p>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    required
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    title="O email não pode ser alterado"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange("phone")}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    type="text"
                    value={formData.position}
                    onChange={handleInputChange("position")}
                    placeholder="Seu cargo na empresa"
                  />
                </div>
              </div>

            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPasswordOpen(true)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Lock className="mr-2 h-4 w-4" />
              Alterar Senha
            </Button>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ChangePasswordForm
      isOpen={isPasswordOpen}
      onClose={() => setIsPasswordOpen(false)}
    />
    </>
  )
}