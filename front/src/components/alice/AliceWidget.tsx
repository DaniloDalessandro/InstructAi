"use client"

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type KeyboardEvent,
} from "react"
import { usePathname } from "next/navigation"
import {
  X,
  ChevronUp,
  Send,
  RotateCcw,
  ChevronRight,
  FileText,
  BookText,
  GraduationCap,
  Video,
  Wrench,
  CheckCircle2,
  Loader2,
  Square,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { aliceAPI, type StreamEvent } from "@/lib/api/alice"
import { useAliceWidget, type ChatBlock, type Source } from "@/contexts/AliceWidgetContext"

// ── Context hints per route ───────────────────────────────────
const PAGE_CONTEXT: Record<string, { label: string; hint: string; suggestions: string[] }> = {
  "/tutoriais": {
    label: "Tutoriais",
    hint: "Você está na área de tutoriais.",
    suggestions: ["Quais tutoriais estão ativos?", "Resuma o tutorial mais recente", "Buscar tutoriais por setor"],
  },
  "/manuais": {
    label: "Manuais",
    hint: "Você está na área de manuais.",
    suggestions: ["Quais manuais existem?", "Buscar procedimento de login", "Manuais do setor TI"],
  },
  "/cursos": {
    label: "Cursos",
    hint: "Você está na área de cursos.",
    suggestions: ["Listar cursos disponíveis", "Qual curso tem mais aulas?", "Cursos com certificado"],
  },
  "/dashboard": {
    label: "Dashboard",
    hint: "Você está no dashboard.",
    suggestions: ["Resuma os números do sistema", "Quantos usuários ativos?", "Conteúdo mais recente"],
  },
  "/alice": {
    label: "Alice",
    hint: "Você está no chat completo da Alice.",
    suggestions: ["O que você pode fazer?", "Buscar em toda a base", "Me dê um resumo geral"],
  },
}

const DEFAULT_SUGGESTIONS = [
  "O que você pode fazer?",
  "Quantos tutoriais ativos?",
  "Listar cursos disponíveis",
]

function getPageCtx(pathname: string) {
  for (const [prefix, ctx] of Object.entries(PAGE_CONTEXT)) {
    if (pathname.startsWith(prefix)) return ctx
  }
  return null
}

// ── Markdown renderer ─────────────────────────────────────────
function MsgText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <div className="text-[13px] leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-semibold text-[13px]">{line.slice(4)}</p>
        if (line.startsWith("## "))  return <p key={i} className="font-semibold text-[13px]">{line.slice(3)}</p>
        if (line.startsWith("# "))   return <p key={i} className="font-semibold text-[13px]">{line.slice(2)}</p>
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return <p key={i} className="flex gap-1.5"><span className="text-primary mt-1 shrink-0">·</span><span>{inlineParse(line.slice(2))}</span></p>
        }
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i}>{inlineParse(line)}</p>
      })}
    </div>
  )
}

function inlineParse(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded bg-muted/60 text-[11px] font-mono">{p.slice(1, -1)}</code>
    return <span key={i}>{p}</span>
  })
}

// ── Source citations ──────────────────────────────────────────
function SourcesWidget({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!sources?.length) return null
  const icon = (t: string) => {
    if (t === "manual")   return <BookText className="w-2.5 h-2.5" />
    if (t === "tutorial") return <GraduationCap className="w-2.5 h-2.5" />
    if (t === "course")   return <Video className="w-2.5 h-2.5" />
    return <FileText className="w-2.5 h-2.5" />
  }
  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="w-2.5 h-2.5" />
        {sources.length} fonte{sources.length !== 1 ? "s" : ""}
        <ChevronRight className={cn("w-2.5 h-2.5 transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1">
          {sources.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted/30 border border-border/40">
              <span className="text-primary">{icon(s.source_type)}</span>
              <span className="text-[10px] font-medium truncate">{s.document_title}</span>
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {Math.round(s.relevance * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tool call pill ────────────────────────────────────────────
function ToolPill({ tool }: { tool: string }) {
  const labels: Record<string, string> = {
    search_knowledge_base: "Base de conhecimento",
    search_manuals: "Manuais",
    search_tutorials: "Tutoriais",
    get_platform_stats: "Estatísticas",
    list_courses: "Cursos",
    list_tutorials: "Tutoriais",
    list_manuals: "Manuais",
    list_sectors: "Setores",
    get_recent_content: "Recentes",
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
      <Wrench className="w-2.5 h-2.5" />
      {labels[tool] ?? tool}
      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
    </span>
  )
}

// ── Typing indicator ──────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  )
}

// ── Alice woman avatar icon ───────────────────────────────────
function AliceFaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Shoulders */}
      <path d="M5 31C5 25.5 9.5 22 16 22C22.5 22 27 25.5 27 31" fill="white" fillOpacity="0.75" />
      {/* Hair — long, frames the face */}
      <path d="M8 14.5C8 8.5 11 5 16 5C21 5 24 8.5 24 14.5V20C22.5 22.5 20 23.5 16 23.5C12 23.5 9.5 22.5 8 20V14.5Z" fill="white" fillOpacity="0.95" />
      {/* Face */}
      <ellipse cx="16" cy="15" rx="5.5" ry="6.5" fill="white" fillOpacity="0.88" />
      {/* Left eye */}
      <ellipse cx="13.5" cy="14" rx="1" ry="1.1" fill="#4c1d95" />
      <circle cx="13.85" cy="13.55" r="0.38" fill="white" />
      {/* Right eye */}
      <ellipse cx="18.5" cy="14" rx="1" ry="1.1" fill="#4c1d95" />
      <circle cx="18.85" cy="13.55" r="0.38" fill="white" />
      {/* Nose hint */}
      <path d="M16 15.5V17.2" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" strokeLinecap="round" />
      {/* Smile */}
      <path d="M13.5 19Q16 21.5 18.5 19" stroke="#4c1d95" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Hair highlight / bangs sheen */}
      <path d="M10.5 13C11 9.5 13 7 16 7C19 7 21 9.5 21.5 13" fill="white" fillOpacity="0.22" />
    </svg>
  )
}

// ── Main Widget ───────────────────────────────────────────────
export function AliceWidget() {
  const {
    isOpen,
    blocks, sessionId, loading,
    open, close, clearHistory,
    setBlocks, setSessionId, setLoading, abortRef,
  } = useAliceWidget()

  const pathname = usePathname()
  const pageCtx = getPageCtx(pathname)

  const [input, setInput] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // autoscroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [blocks, loading])

  // focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 120)
  }, [isOpen])

  // autoresize textarea
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = "auto"
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + "px"
  }, [input])

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setBlocks(b => b.map((block, i) =>
      i === b.length - 1 && block.role === "alice"
        ? { ...block, streaming: false }
        : block
    ))
  }, [abortRef, setBlocks, setLoading])

  const send = useCallback(async (q?: string) => {
    const query = (q ?? input).trim()
    if (!query || loading) return

    setInput("")
    setLoading(true)

    // Build context hint
    const ctxHint = pageCtx ? `\n[Contexto: ${pageCtx.hint}]` : ""
    const fullQuery = query + ctxHint

    const userId = `u-${Date.now()}`
    setBlocks(b => [...b, { id: userId, role: "user", text: query }])

    const aliceId = `a-${Date.now()}`
    setBlocks(b => [...b, { id: aliceId, role: "alice", query, text: "", streaming: true, toolCalls: [] }])

    const abort = new AbortController()
    abortRef.current = abort

    try {
      await aliceAPI.streamMessage(
        { message: fullQuery, session_id: sessionId || undefined, create_new_session: !sessionId },
        (event: StreamEvent) => {
          if (event.type === "session" && !sessionId) {
            setSessionId(event.session_id)
          } else if (event.type === "token") {
            setBlocks(b => b.map(block =>
              block.id === aliceId && block.role === "alice"
                ? { ...block, text: block.text + event.content }
                : block
            ))
          } else if (event.type === "tool_start") {
            setBlocks(b => b.map(block =>
              block.id === aliceId && block.role === "alice"
                ? { ...block, toolCalls: [...(block.toolCalls ?? []), event.tool] }
                : block
            ))
          } else if (event.type === "done") {
            setBlocks(b => b.map(block =>
              block.id === aliceId && block.role === "alice"
                ? { ...block, streaming: false, text: event.full_response || block.text }
                : block
            ))
            setLoading(false)
          } else if (event.type === "error") {
            setBlocks(b => b.map(block =>
              block.id === aliceId && block.role === "alice"
                ? { ...block, streaming: false, error: true, text: event.message || "Erro desconhecido." }
                : block
            ))
            setLoading(false)
          }
        },
        abort.signal,
      )
    } catch (err: any) {
      if (err?.name === "AbortError") return
      setBlocks(b => b.map(block =>
        block.id === aliceId && block.role === "alice"
          ? { ...block, streaming: false, error: true, text: "Erro de conexão. Tente novamente." }
          : block
      ))
      setLoading(false)
    } finally {
      abortRef.current = null
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, loading, sessionId, pageCtx, setBlocks, setSessionId, setLoading, abortRef])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }, [send])

  const suggestions = pageCtx?.suggestions ?? DEFAULT_SUGGESTIONS
  const hasMessages = blocks.length > 0

  return (
    <>
      {/* ── Floating Button ────────────────────────────────── */}
      <button
        onClick={() => {
          if (isOpen && isCollapsed) {
            setIsCollapsed(false)
          } else if (isOpen) {
            close()
          } else {
            open()
            setIsCollapsed(false)
          }
        }}
        aria-label="Abrir Alice"
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "hover:scale-110 hover:shadow-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isOpen && !isCollapsed ? "scale-90 opacity-80" : "scale-100",
        )}
        style={{
          background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)",
          boxShadow: isOpen && !isCollapsed
            ? "0 4px 24px rgba(94,106,210,0.4)"
            : "0 8px 32px rgba(94,106,210,0.5), 0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {!isOpen && (
          <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
            style={{ background: "linear-gradient(135deg, #5e6ad2, #7c3aed)" }}
          />
        )}
        {isOpen && !isCollapsed
          ? <X className="w-5 h-5 text-white" />
          : <AliceFaceIcon className="w-8 h-8" />
        }
      </button>

      {/* ── Minimized pill (beside button) ─────────────────── */}
      {isOpen && isCollapsed && (
        <div
          className="fixed bottom-6 right-[5.5rem] z-50 h-14 flex items-center gap-2.5 px-3 pr-2 rounded-2xl cursor-pointer transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)",
            boxShadow: "0 8px 32px rgba(94,106,210,0.5), 0 2px 8px rgba(0,0,0,0.2)",
          }}
          onClick={() => setIsCollapsed(false)}
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AliceFaceIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white leading-none">Alice</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
            <p className="text-[10px] text-white/70 mt-0.5">
              {hasMessages
                ? `${blocks.length} mensagem${blocks.length !== 1 ? "s" : ""}`
                : "Clique para conversar"}
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); close() }}
            title="Fechar"
            className="w-6 h-6 ml-1 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Chat Panel ─────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-1.5rem)]",
          "flex flex-col rounded-2xl border border-border/60 bg-background",
          "shadow-2xl shadow-black/20",
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen && !isCollapsed
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none",
        )}
        style={{ height: "min(600px, calc(100vh - 8rem))" }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0 rounded-t-2xl"
          style={{ background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)" }}
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AliceFaceIcon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white leading-none">Alice</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
            <p className="text-[10px] text-white/70 mt-0.5 truncate">
              {pageCtx ? `Contexto: ${pageCtx.label}` : "Assistente de IA · sempre disponível"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {hasMessages && (
              <button
                onClick={clearHistory}
                title="Limpar conversa"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(true)}
              title="Minimizar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button
              onClick={close}
              title="Fechar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Messages ───────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
        >
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center h-full gap-5 py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)" }}
              >
                <AliceFaceIcon className="w-10 h-10" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Olá! Sou a Alice.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Posso ajudar com tutoriais, manuais, cursos e muito mais.
                </p>
              </div>
              <div className="w-full space-y-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="w-full text-left px-3 py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {blocks.map(block => (
            <div key={block.id} className={cn("flex", block.role === "user" ? "justify-end" : "justify-start")}>
              {block.role === "user" ? (
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm text-[13px] text-white"
                  style={{ background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)" }}
                >
                  {block.text}
                </div>
              ) : (
                <div className="max-w-[88%] flex gap-2">
                  <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #5e6ad2, #7c3aed)" }}
                  >
                    <AliceFaceIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {block.toolCalls && block.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {block.toolCalls.map((t, i) => <ToolPill key={i} tool={t} />)}
                      </div>
                    )}

                    {block.streaming && !block.text ? (
                      <TypingDots />
                    ) : block.error ? (
                      <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-destructive/10 border border-destructive/20">
                        <p className="text-[12px] text-destructive">{block.text}</p>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-muted/50 border border-border/40">
                        <MsgText text={block.text} />
                        {block.streaming && (
                          <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                        )}
                        {!block.streaming && block.sources && (
                          <SourcesWidget sources={block.sources} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Suggestions row ─────────────────────────────── */}
        {hasMessages && !loading && (
          <div className="px-4 py-1.5 flex gap-1.5 overflow-x-auto shrink-0 border-t border-border/30 scrollbar-none">
            {suggestions.slice(0, 3).map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="whitespace-nowrap text-[10px] px-2.5 py-1 rounded-full border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all text-muted-foreground shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Footer / Input ──────────────────────────────── */}
        <div className="px-3 py-2.5 border-t border-border/50 shrink-0 rounded-b-2xl bg-background">
          <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 focus-within:border-primary/50 focus-within:bg-background transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Pergunte à Alice..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-[13px] placeholder:text-muted-foreground/60 focus:outline-none min-h-[20px] max-h-[100px] disabled:opacity-50"
            />
            <div className="flex items-center gap-1 shrink-0">
              {loading ? (
                <button
                  onClick={stopStream}
                  title="Parar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                >
                  <Square className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  disabled={!input.trim()}
                  title="Enviar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: input.trim() ? "linear-gradient(135deg, #5e6ad2, #7c3aed)" : undefined }}
                >
                  <Send className={cn("w-3.5 h-3.5", input.trim() ? "text-white" : "text-muted-foreground")} />
                </button>
              )}
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">
            Enter envia · Shift+Enter nova linha
          </p>
        </div>
      </div>
    </>
  )
}
