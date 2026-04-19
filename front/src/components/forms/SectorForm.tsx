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
import type { Sector, SectorFormData } from "@/types/sector.types"

interface SectorFormProps {
  open: boolean
  handleClose: () => void
  initialData: Sector | null
  onSubmit: (data: SectorFormData) => Promise<void>
}

export default function SectorForm({ open, handleClose, initialData, onSubmit }: SectorFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<SectorFormData>({
    name: "",
  })

  useEffect(() => {
    if (initialData && open) {
      setFormData({
        name: initialData.name || "",
      })
    } else if (!open) {
      // Limpa o formulário ao fechar o diálogo
      setFormData({
        name: "",
      })
    }
  }, [initialData, open])

  const handleInputChange = (field: keyof SectorFormData) => (
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
      await onSubmit(formData)
      handleClose()
    } catch (error) {
      console.error("Erro ao salvar setor:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-w-[90vw]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary">
              {initialData ? "Editar Setor" : "Novo Setor"}
            </DialogTitle>
            <hr className="mt-2 border-b border-gray-200" />
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange("name")}
                required
                placeholder="Digite o nome do setor"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
