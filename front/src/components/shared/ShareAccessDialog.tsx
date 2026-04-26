"use client"

import { useState, useEffect, useCallback } from "react"
import { UserPlus, X, Loader2, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"

type Admin = { id: number; email: string; name: string }

interface ShareAccessDialogProps {
  open: boolean
  onClose: () => void
  resourceId: string
  resourceTitle: string
  getAdmins: (id: string) => Promise<Admin[]>
  updateAdmins: (
    id: string,
    payload: { add?: string[]; remove?: string[] }
  ) => Promise<{ shared_admins: Admin[]; errors?: string[] }>
}

export function ShareAccessDialog({
  open,
  onClose,
  resourceId,
  resourceTitle,
  getAdmins,
  updateAdmins,
}: ShareAccessDialogProps) {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAdmins(resourceId)
      setAdmins(list)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar os acessos.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [resourceId, getAdmins])

  useEffect(() => {
    if (open) { setEmail(""); load() }
  }, [open, load])

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setAdding(true)
    try {
      const res = await updateAdmins(resourceId, { add: [trimmed] })
      setAdmins(res.shared_admins)
      if (res.errors?.length) {
        toast({ title: "Aviso", description: res.errors.join(" "), variant: "destructive" })
      } else {
        toast({ title: "Acesso concedido", description: `${trimmed} agora pode editar este conteúdo.` })
        setEmail("")
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (admin: Admin) => {
    setRemovingId(admin.id)
    try {
      const res = await updateAdmins(resourceId, { remove: [admin.email] })
      setAdmins(res.shared_admins)
      toast({ title: "Acesso removido", description: `${admin.email} não pode mais editar este conteúdo.` })
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Gerenciar Acesso
          </DialogTitle>
          <DialogDescription className="truncate">
            {resourceTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Add field */}
        <div className="flex gap-2">
          <Input
            placeholder="email@empresa.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            disabled={adding}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={adding || !email.trim()} size="sm">
            {adding
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <UserPlus className="w-4 h-4" />
            }
          </Button>
        </div>

        <p className="text-xs text-muted-foreground -mt-1">
          O usuário precisa ter uma conta no sistema. Administradores delegados podem visualizar e editar, mas não excluir.
        </p>

        {/* List */}
        <div className="space-y-1 min-h-[60px]">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum administrador delegado ainda.
            </p>
          ) : (
            admins.map(admin => (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{admin.name || admin.email}</p>
                  {admin.name && (
                    <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={removingId === admin.id}
                  onClick={() => handleRemove(admin)}
                >
                  {removingId === admin.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <X className="w-3.5 h-3.5" />
                  }
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
