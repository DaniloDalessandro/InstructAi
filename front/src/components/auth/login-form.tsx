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
      {/* Brand — logo + título */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg
            className="w-8 h-8 text-white"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Livro aberto */}
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            <circle cx="12" cy="9" r="2" fill="currentColor" opacity="0.8" />
            <path d="M12 11v2" opacity="0.6" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            InstructAI
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Sistema de Gestão de Conhecimento
          </p>
        </div>
      </div>

      {/* Card do formulário */}
      <Card className="bg-white shadow-xl rounded-2xl border border-gray-100">
        <CardContent className="p-7">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Erro de autenticação */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-red-500 mt-0.5 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-red-700 text-sm leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Campo Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-gray-400 text-xs">
        © {new Date().getFullYear()} InstructAI · Todos os direitos reservados
      </p>
    </div>
  )
}
