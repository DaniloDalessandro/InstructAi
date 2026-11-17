"use client"

import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthContext } from "@/contexts/AuthContext"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuthContext()

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err?.message || "Credenciais inválidas. Verifique e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-[400px]", className)} {...props}>

      {/* ── Logo — mobile only (hidden on desktop where left panel shows) ── */}
      <div
        className="lg:hidden flex flex-col items-center gap-3 mb-10"
        style={{ opacity: 0, animation: "slideUp 0.45s ease-out forwards" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)",
            boxShadow: "0 4px 20px rgba(94,106,210,0.4)",
            animation: "glowPulse 3.5s ease-in-out 1.2s infinite",
          }}
        >
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
            <polygon points="32,11 55,23 32,35 9,23" fill="white" fillOpacity="0.95" />
            <path d="M19,27.5 L19,40 Q32,48.5 45,40 L45,27.5 L32,33.5 Z" fill="white" fillOpacity="0.85" />
            <line x1="55" y1="23" x2="55" y2="37" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
            <circle cx="55" cy="39.5" r="3" fill="white" opacity="0.85" />
          </svg>
        </div>
        <span className="text-lg font-semibold tracking-tight">InstructAI</span>
      </div>

      {/* ── Welcome headline ── */}
      <div
        className="mb-8"
        style={{ opacity: 0, animation: "slideUp 0.45s ease-out 0.08s forwards" }}
      >
        <h1
          className="text-[1.65rem] font-semibold text-foreground leading-tight"
          style={{ letterSpacing: "-0.4px" }}
        >
          Bem-vindo de volta
        </h1>
        <p className="text-muted-foreground text-[14px] mt-1.5 leading-relaxed">
          Entre com suas credenciais para acessar o sistema
        </p>
      </div>

      {/* ── Form ── */}
      <form
        onSubmit={handleLogin}
        className="space-y-5"
        style={{ opacity: 0, animation: "slideUp 0.45s ease-out 0.15s forwards" }}
      >

        {/* Error message */}
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

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] font-medium text-foreground/70">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground/45 pointer-events-none" />
            <Input
              id="email"
              type="email"
              placeholder="seu.email@empresa.com"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-11 pl-10 text-[14px] rounded-xl bg-muted/25 border-border/50 focus-visible:border-primary/50 focus-visible:ring-0 transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13px] font-medium text-foreground/70">
            Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground/45 pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-11 pl-10 pr-11 text-[14px] rounded-xl bg-muted/25 border-border/50 focus-visible:border-primary/50 focus-visible:ring-0 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/45 hover:text-foreground/70 hover:bg-muted/60 transition-all"
            >
              {showPassword
                ? <EyeOff className="w-[15px] h-[15px]" />
                : <Eye className="w-[15px] h-[15px]" />
              }
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div className="text-right -mt-1">
          <a
            href="/esqueci-senha"
            className="text-[13px] text-muted-foreground/60 hover:text-primary transition-colors"
          >
            Esqueci minha senha
          </a>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 font-medium text-[14px] rounded-xl text-white border-0 mt-1 transition-all"
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
              Entrando...
            </span>
          ) : (
            "Entrar"
          )}
        </Button>
        <a href="/validar-certificado" className="block text-center text-sm text-muted-foreground hover:text-primary underline underline-offset-4">Validar certificado</a>
      </form>

      {/* ── Footer ── */}
      <p
        className="text-center text-[11px] mt-10"
        style={{
          color: "var(--muted-foreground)",
          opacity: 0,
          animation: "slideUp 0.45s ease-out 0.28s forwards",
        }}
      >
        <span style={{ opacity: 0.4 }}>
          © {new Date().getFullYear()} InstructAI · Todos os direitos reservados
        </span>
      </p>
    </div>
  )
}
