"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { changePassword, ChangePasswordData } from '@/lib/api/auth'

interface ChangePasswordFormProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordForm({ isOpen, onClose }: ChangePasswordFormProps) {

  const [formData, setFormData] = useState<ChangePasswordData & { confirmPassword: string }>({
    old_password: '',
    new_password: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    }
  }

  const passwordValidation = validatePassword(formData.new_password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validações
    if (!formData.old_password.trim()) {
      setError('Senha atual é obrigatória')
      setLoading(false)
      return
    }

    if (!passwordValidation.minLength) {
      setError('A nova senha deve ter pelo menos 8 caracteres')
      setLoading(false)
      return
    }

    if (formData.new_password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (formData.old_password === formData.new_password) {
      setError('A nova senha deve ser diferente da atual')
      setLoading(false)
      return
    }

    try {
      await changePassword({
        old_password: formData.old_password,
        new_password: formData.new_password,
      })

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setFormData({ old_password: '', new_password: '', confirmPassword: '' })
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      setFormData({ old_password: '', new_password: '', confirmPassword: '' })
      setError('')
      setSuccess(false)
    }
  }

  if (!isOpen) {

    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogContent className="sm:max-w-md w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Digite sua senha atual e escolha uma nova senha segura.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <p className="font-semibold text-green-700">Senha alterada com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-1">O dialog será fechado em instantes.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Senha Atual */}
            <div className="space-y-2">
              <Label htmlFor="old_password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="old_password"
                  type={showPasswords.old ? 'text' : 'password'}
                  value={formData.old_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, old_password: e.target.value }))}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility('old')}
                  disabled={loading}
                >
                  {showPasswords.old ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.new_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_password: e.target.value }))}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={loading}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Critérios de Senha — visual em grade para leitura mais rápida */}
              {formData.new_password && (
                <div className="grid grid-cols-2 gap-1 pt-1">
                  {[
                    { ok: passwordValidation.minLength,  label: "8+ caracteres" },
                    { ok: passwordValidation.hasUpper,   label: "Maiúscula" },
                    { ok: passwordValidation.hasLower,   label: "Minúscula" },
                    { ok: passwordValidation.hasNumber,  label: "Número" },
                    { ok: passwordValidation.hasSpecial, label: "Caractere especial" },
                  ].map(({ ok, label }) => (
                    <span
                      key={label}
                      className={`text-[11px] flex items-center gap-1 ${ok ? "text-green-600" : "text-muted-foreground/70"}`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmar Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={loading}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && formData.new_password !== formData.confirmPassword && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive" />
                  As senhas não coincidem
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !passwordValidation.minLength}>
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </DialogFooter>
          </form>
        )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}