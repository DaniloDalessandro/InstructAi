"use client"

import { useEffect, useState } from "react"
import { Lock, EyeOff, Eye, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateResetToken, confirmPasswordReset } from "@/lib/api/auth"
import Link from "next/link"
import { use } from "react"

interface Props {
  params: Promise<{ token: string }>
}

export default function RedefinirSenhaPage({ params }: Props) {
  const { token } = use(params)

  const [email, setEmail] = useState("")
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    validateResetToken(token)
      .then(data => {
        setEmail(data.email)
        setTokenValid(true)
      })
      .catch(() => setTokenValid(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.")
      return
    }

    setIsLoading(true)
    try {
      await confirmPasswordReset(token, password, confirm)
      setDone(true)
    } catch (err: any) {
      setError(err?.message || "Erro ao redefinir senha.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-6 bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(94,106,210,0.07), transparent 70%)",
        }}
      />

      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)",
              boxShadow: "0 4px 16px rgba(94,106,210,0.4)",
            }}
          >
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              <polygon points="32,11 55,23 32,35 9,23" fill="white" fillOpacity="0.95" />
              <path d="M19,27.5 L19,40 Q32,48.5 45,40 L45,27.5 L32,33.5 Z" fill="white" fillOpacity="0.85" />
              <line x1="55" y1="23" x2="55" y2="37" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              <circle cx="55" cy="39.5" r="3" fill="white" opacity="0.85" />
            </svg>
          </div>
          <span className="font-semibold text-[17px]" style={{ letterSpacing: "-0.3px" }}>InstructAI</span>
        </div>

        {/* Loading validation */}
        {tokenValid === null && (
          <div className="flex items-center justify-center gap-3 text-muted-foreground py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[14px]">Validando link...</span>
          </div>
        )}

        {/* Invalid token */}
        {tokenValid === false && (
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(229,72,77,0.07)", border: "1px solid rgba(229,72,77,0.2)" }}
            >
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-[1.4rem] font-semibold mb-2" style={{ letterSpacing: "-0.3px" }}>
              Link inválido
            </h1>
            <p className="text-muted-foreground text-[14px] leading-relaxed mb-8">
              Este link de redefinição de senha é inválido ou já expirou. Solicite um novo link.
            </p>
            <Link
              href="/esqueci-senha"
              className="inline-block text-[14px] font-medium px-5 py-2.5 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)" }}
            >
              Solicitar novo link
            </Link>
          </div>
        )}

        {/* Success state */}
        {tokenValid === true && done && (
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(94,106,210,0.1)", border: "1px solid rgba(94,106,210,0.2)" }}
            >
              <CheckCircle2 className="w-7 h-7" style={{ color: "#5e6ad2" }} />
            </div>
            <h1 className="text-[1.4rem] font-semibold mb-2" style={{ letterSpacing: "-0.3px" }}>
              Senha redefinida!
            </h1>
            <p className="text-muted-foreground text-[14px] leading-relaxed mb-8">
              Sua senha foi alterada com sucesso. Agora você pode entrar com a nova senha.
            </p>
            <Link
              href="/login"
              className="inline-block text-[14px] font-medium px-5 py-2.5 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)" }}
            >
              Ir para o login
            </Link>
          </div>
        )}

        {/* Form */}
        {tokenValid === true && !done && (
          <>
            <div className="mb-8">
              <h1 className="text-[1.65rem] font-semibold leading-tight" style={{ letterSpacing: "-0.4px" }}>
                Nova senha
              </h1>
              <p className="text-muted-foreground text-[14px] mt-1.5 leading-relaxed">
                Crie uma nova senha para <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border"
                  style={{
                    background: "rgba(229,72,77,0.07)",
                    borderColor: "rgba(229,72,77,0.22)",
                    animation: "shake 0.4s ease-out",
                  }}
                >
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-destructive text-[13px] leading-snug">{error}</span>
                </div>
              )}

              {/* New password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground/70">
                  Nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground/45 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 pl-10 pr-11 text-[14px] rounded-xl bg-muted/25 border-border/50 focus-visible:border-primary/50 focus-visible:ring-0 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/45 hover:text-foreground/70 hover:bg-muted/60 transition-all"
                  >
                    {showPassword ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-[13px] font-medium text-foreground/70">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground/45 pointer-events-none" />
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="h-11 pl-10 pr-11 text-[14px] rounded-xl bg-muted/25 border-border/50 focus-visible:border-primary/50 focus-visible:ring-0 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/45 hover:text-foreground/70 hover:bg-muted/60 transition-all"
                  >
                    {showConfirm ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-medium text-[14px] rounded-xl text-white border-0 transition-all"
                style={{
                  background: isLoading
                    ? "rgba(94,106,210,0.55)"
                    : "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)",
                  boxShadow: isLoading
                    ? "none"
                    : "0 4px 20px rgba(94,106,210,0.32), 0 1px 4px rgba(0,0,0,0.18)",
                }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
