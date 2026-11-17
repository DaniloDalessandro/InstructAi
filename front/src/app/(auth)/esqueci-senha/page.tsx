"use client"

import { useState } from "react"
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/lib/api/auth"
import Link from "next/link"

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar e-mail. Tente novamente.")
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

        {sent ? (
          /* ── Success state ── */
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(94,106,210,0.1)", border: "1px solid rgba(94,106,210,0.2)" }}
            >
              <CheckCircle2 className="w-7 h-7" style={{ color: "#5e6ad2" }} />
            </div>
            <h1 className="text-[1.4rem] font-semibold mb-2" style={{ letterSpacing: "-0.3px" }}>
              E-mail enviado!
            </h1>
            <p className="text-muted-foreground text-[14px] leading-relaxed mb-6">
              Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
            </p>
            <p className="text-muted-foreground text-[13px] mb-8">
              Verifique sua caixa de entrada e também a pasta de spam.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[14px] font-medium"
              style={{ color: "#5e6ad2" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="mb-8">
              <h1 className="text-[1.65rem] font-semibold leading-tight" style={{ letterSpacing: "-0.4px" }}>
                Esqueci minha senha
              </h1>
              <p className="text-muted-foreground text-[14px] mt-1.5 leading-relaxed">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
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
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 pl-10 text-[14px] rounded-xl bg-muted/25 border-border/50 focus-visible:border-primary/50 focus-visible:ring-0 transition-colors"
                  />
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
                    Enviando...
                  </span>
                ) : (
                  "Enviar link de redefinição"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
