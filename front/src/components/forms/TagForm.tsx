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
import type { Tag, TagFormData } from "@/types/tag.types"

interface TagFormProps {
  open: boolean
  handleClose: () => void
  initialData: Tag | null
  onSubmit: (data: TagFormData) => Promise<void>
}

const defaultColors = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // yellow
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
]

export default function TagForm({ open, handleClose, initialData, onSubmit }: TagFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<TagFormData>({
    name: "",
    color: defaultColors[0],
  })

  useEffect(() => {
    if (initialData && open) {
      setFormData({
        name: initialData.name || "",
        color: initialData.color || defaultColors[0],
      })
    } else if (!open) {
      // Limpa o formulário ao fechar o diálogo
      setFormData({
        name: "",
        color: defaultColors[0],
      })
    }
  }, [initialData, open])

  const handleInputChange = (field: keyof TagFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({
      ...prev,
      color
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await onSubmit(formData)
      handleClose()
    } catch (error) {
      console.error("Erro ao salvar tag:", error)
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
              {initialData ? "Editar Tag" : "Nova Tag"}
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
                placeholder="Digite o nome da tag"
              />
            </div>

            <div className="grid gap-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? "border-gray-900 scale-110"
                        : "border-gray-300 hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="custom-color" className="text-sm">
                  Ou escolha uma cor personalizada:
                </Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={formData.color}
                  onChange={handleInputChange("color")}
                  className="w-20 h-10 cursor-pointer"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="grid gap-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.name || "Nome da Tag"}
                </span>
              </div>
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
