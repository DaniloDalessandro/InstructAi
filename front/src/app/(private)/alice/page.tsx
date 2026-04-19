"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Bot, Send, User, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { aliceAPI } from "@/lib/api/alice"

interface Message {
  id: string
  type: 'user' | 'assistant' | 'error'
  content: string
  timestamp: Date
  metadata?: {
    sql_query?: string
    execution_time_ms?: number
    result_count?: number
    error_details?: string
  }
}


export default function AlicePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Adiciona mensagem inicial
    try {
      const welcomeMessage: Message = {
        id: "welcome",
        type: "assistant",
        content: "Olá! Eu sou a Alice, sua assistente virtual do InstructAI. Posso ajudá-lo a consultar dados sobre tutoriais, manuais, cursos e muito mais. Faça uma pergunta e eu transformarei ela em uma consulta para buscar as informações que você precisa!",
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
      setIsPageLoading(false)
    } catch (error) {

      setIsPageLoading(false)
    }
  }, [])

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await aliceAPI.sendMessage({
        message: inputMessage.trim(),
        session_id: sessionId || undefined,
        create_new_session: !sessionId
      })

      if (response.success) {
        // Atualiza session_id se for uma nova sessão
        if (!sessionId && response.session_id) {
          setSessionId(response.session_id)
        }

        const assistantMessage: Message = {
          id: Date.now().toString() + "_assistant",
          type: "assistant",
          content: response.response,
          timestamp: new Date(),
          metadata: {
            sql_query: response.sql_query,
            execution_time_ms: response.execution_time_ms,
            result_count: response.result_count
          }
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: Date.now().toString() + "_error",
          type: "error",
          content: response.response || response.error || "Erro desconhecido",
          timestamp: new Date(),
          metadata: {
            error_details: response.error
          }
        }

        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {

      const errorMessage: Message = {
        id: Date.now().toString() + "_error",
        type: "error",
        content: "Erro de conexão com o servidor. Tente novamente.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNewSession = () => {
    setSessionId("")
    setMessages([{
      id: "welcome_new",
      type: "assistant",
      content: "Nova conversa iniciada! Como posso ajudá-lo?",
      timestamp: new Date()
    }])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }


  // Estado de carregamento inicial
  if (isPageLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] animate-fade-in">
        <div className="flex items-center justify-between pb-4 border-b">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Fale com Alice
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
            <p className="text-sm text-muted-foreground">Carregando Alice...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between pb-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">Alice</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Assistente inteligente do InstructAI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicador de status */}
          <Badge
            variant={isLoading ? "secondary" : "outline"}
            className={`flex items-center gap-1.5 text-xs ${!isLoading ? "border-green-200 text-green-700 bg-green-50" : ""}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Online
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={startNewSession}
            disabled={isLoading}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Nova Conversa
          </Button>
        </div>
      </div>

      {/* Área do chat — ocupa todo espaço restante */}
      <Card className="flex-1 flex flex-col overflow-hidden mt-4 border-border/60">
        {/* Área de mensagens com scroll */}
        <ScrollArea className="flex-1 px-4 md:px-6">
          <div className="space-y-5 py-5 max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Avatar da Alice (esquerda) */}
                {message.type !== "user" && (
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white mt-0.5 ${
                    message.type === "error"
                      ? "bg-destructive"
                      : "bg-gradient-to-br from-purple-500 to-indigo-600"
                  }`}>
                    {message.type === "error"
                      ? <span className="text-xs font-bold">!</span>
                      : <Bot className="h-3.5 w-3.5" />
                    }
                  </div>
                )}

                <div className="flex flex-col gap-1 max-w-[75%]">
                  {/* Bolha da mensagem */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : message.type === "error"
                        ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-bl-sm"
                        : "bg-muted/60 border border-border/40 text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {/* Timestamp */}
                  <span className={`text-[11px] text-muted-foreground/60 ${message.type === "user" ? "text-right" : "text-left"}`}>
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {/* Avatar do usuário (direita) */}
                {message.type === "user" && (
                  <div className="flex-shrink-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-foreground mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Indicador de digitação quando Alice está respondendo */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Input fixo na parte inferior */}
        <div className="p-4 md:p-5 shrink-0">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              ref={inputRef}
              placeholder="Pergunte algo sobre os dados do InstructAI..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1 h-10 bg-background"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground/50 mt-2">
            Pressione Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </Card>
    </div>
  )
}