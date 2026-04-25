"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthContext } from "@/contexts/AuthContext"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const { login } = useAuthContext()

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    try {
      // Usar a função login do contexto que já faz tudo
      await login(email, password)
      // O router.push('/dashboard') já é feito dentro do login
    } catch (err: any) {
      const errorMessage = err?.message || "Erro ao fazer login. Verifique suas credenciais."
      setError(errorMessage)
    }
  }

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Brand */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#5e6ad2" }}>
          <svg
            className="w-6 h-6 text-white"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ letterSpacing: "-0.5px" }}>
            InstructAI
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sistema de Gestão de Conhecimento
          </p>
        </div>
      </div>

      {/* Card do formulário */}
      <Card className="rounded-xl border bg-card">
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-destructive mt-0.5 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-destructive text-sm leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium text-foreground/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground/80">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-9 font-medium"
            >
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-muted-foreground/50 text-xs">
        © {new Date().getFullYear()} InstructAI · Todos os direitos reservados
      </p>
    </div>
  )
}
