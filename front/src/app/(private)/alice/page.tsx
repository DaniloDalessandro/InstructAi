"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  RefreshCw,
  Copy,
  Mic,
  MicOff,
  Database,
  GraduationCap,
  Video,
  BarChart3,
  Search,
  Table as TableIcon,
  BookText,
  Building2,
  Loader2,
  Slash,
  ChevronRight,
  Square,
  FileText,
  Wrench,
  CheckCircle2,
  PlusCircle,
  Clock,
  Trash2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { aliceAPI, type StreamEvent, type SessionSummary } from "@/lib/api/alice"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────────
// Shared Alice face icon (same as floating widget)
// ────────────────────────────────────────────────────────────
function AliceFaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M5 31C5 25.5 9.5 22 16 22C22.5 22 27 25.5 27 31" fill="white" fillOpacity="0.75" />
      <path d="M8 14.5C8 8.5 11 5 16 5C21 5 24 8.5 24 14.5V20C22.5 22.5 20 23.5 16 23.5C12 23.5 9.5 22.5 8 20V14.5Z" fill="white" fillOpacity="0.95" />
      <ellipse cx="16" cy="15" rx="5.5" ry="6.5" fill="white" fillOpacity="0.88" />
      <ellipse cx="13.5" cy="14" rx="1" ry="1.1" fill="#4c1d95" />
      <circle cx="13.85" cy="13.55" r="0.38" fill="white" />
      <ellipse cx="18.5" cy="14" rx="1" ry="1.1" fill="#4c1d95" />
      <circle cx="18.85" cy="13.55" r="0.38" fill="white" />
      <path d="M16 15.5V17.2" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M13.5 19Q16 21.5 18.5 19" stroke="#4c1d95" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M10.5 13C11 9.5 13 7 16 7C19 7 21 9.5 21.5 13" fill="white" fillOpacity="0.22" />
    </svg>
  )
}

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type Source = {
  document_title: string
  source_type: string
  page?: number
  content: string
  relevance: number
}

type Block =
  | { id: string; role: "user"; text: string }
  | {
      id: string
      role: "alice"
      query: string
      text: string
      streaming: boolean
      error?: boolean
      sources?: Source[]
      toolCalls?: string[]
    }

// ────────────────────────────────────────────────────────────
// Suggestions & commands
// ────────────────────────────────────────────────────────────
const SUGGESTED = [
  { icon: BarChart3,   label: "Quantos tutoriais ativos?",  q: "Quantos tutoriais temos ativos?" },
  { icon: TableIcon,   label: "Listar cursos disponíveis",  q: "Quais cursos estão disponíveis?" },
  { icon: BookText,    label: "Buscar em manuais",          q: "O que fala sobre procedimentos internos nos manuais?" },
  { icon: Search,      label: "Buscar por tema",            q: "Me mostre conteúdo sobre LGPD" },
]

const SLASH_COMMANDS = [
  { cmd: "/manuais",   icon: BookText,      desc: "Buscar em manuais PDF" },
  { cmd: "/tutoriais", icon: GraduationCap, desc: "Buscar em tutoriais" },
  { cmd: "/cursos",    icon: Video,         desc: "Consultar cursos" },
  { cmd: "/setor",     icon: Building2,     desc: "Filtrar por setor" },
  { cmd: "/recentes",  icon: RefreshCw,     desc: "Conteúdo recente" },
  { cmd: "/stats",     icon: BarChart3,     desc: "Estatísticas da plataforma" },
]

// ────────────────────────────────────────────────────────────
// Markdown bold renderer
// ────────────────────────────────────────────────────────────
function formatMsg(text: string) {
  const lines = text.split("\n")
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const rendered = parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    )
    return <p key={li} className={line.trim() ? "" : "h-2"}>{rendered}</p>
  })
}

// ────────────────────────────────────────────────────────────
// Source citations
// ────────────────────────────────────────────────────────────
function SourcesWidget({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!sources?.length) return null

  const typeIcon = (t: string) => {
    if (t === "manual")   return <BookText className="w-3 h-3" />
    if (t === "tutorial") return <GraduationCap className="w-3 h-3" />
    if (t === "course")   return <Video className="w-3 h-3" />
    return <FileText className="w-3 h-3" />
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="w-3 h-3" />
        {sources.length} fonte{sources.length !== 1 ? "s" : ""} consultada{sources.length !== 1 ? "s" : ""}
        <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-1.5">
          {sources.map((s, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-primary mt-0.5">{typeIcon(s.source_type)}</span>
              <div className="min-w-0">
                <div className="text-[12px] font-medium truncate">{s.document_title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {s.source_type}{s.page ? ` · p.${s.page}` : ""} · {Math.round(s.relevance * 100)}% relevância
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Tool call indicator
// ────────────────────────────────────────────────────────────
function ToolCallBadge({ tool }: { tool: string }) {
  const labels: Record<string, string> = {
    search_knowledge_base: "Base de conhecimento",
    search_manuals: "Manuais",
    search_tutorials: "Tutoriais",
    get_platform_stats: "Estatísticas",
    list_courses: "Cursos",
    list_tutorials: "Tutoriais",
    list_manuals: "Manuais",
    list_sectors: "Setores",
    get_recent_content: "Conteúdo recente",
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
      <Wrench className="w-3 h-3" />
      {labels[tool] ?? tool}
      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Relative time helper
// ────────────────────────────────────────────────────────────
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "agora"
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d`
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function AlicePage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [showSlash, setShowSlash] = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)
  const [contextTag, setContextTag] = useState<"todos" | "tutoriais" | "cursos" | "manuais">("todos")

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string>("")

  const canvasRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load sessions list
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const data = await aliceAPI.getSessions()
      setSessions(data)
    } catch {
      // silently fail — sidebar just stays empty
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // autoscroll
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTo({ top: canvasRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [blocks, loading])

  // autoresize textarea
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = "auto"
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px"
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
  }, [])

  // Load a previous session
  const loadSession = useCallback(async (sid: string) => {
    if (loading) return
    stopStream()
    setBlocks([])
    setSessionId(sid)
    setActiveSessionId(sid)

    try {
      const detail = await aliceAPI.getSession(sid)
      const restored: Block[] = []
      detail.messages.forEach((msg, i) => {
        const id = `loaded-${i}`
        if (msg.role === "user") {
          restored.push({ id, role: "user", text: msg.content })
        } else {
          restored.push({ id, role: "alice", query: "", text: msg.content, streaming: false })
        }
      })
      setBlocks(restored)
    } catch {
      setSessionId("")
      setActiveSessionId("")
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [loading, stopStream])

  // Delete a session
  const deleteSession = useCallback(async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation()
    await aliceAPI.deleteSession(sid)
    setSessions(s => s.filter(x => x.session_id !== sid))
    if (activeSessionId === sid) {
      startNewSession()
    }
  }, [activeSessionId])

  const send = useCallback(async (q?: string) => {
    const query = (q ?? input).trim()
    if (!query || loading) return

    setInput("")
    setShowSlash(false)
    setLoading(true)

    const userId = `u-${Date.now()}`
    setBlocks(b => [...b, { id: userId, role: "user", text: query }])

    const aliceId = `a-${Date.now()}`
    setBlocks(b => [...b, { id: aliceId, role: "alice", query, text: "", streaming: true, toolCalls: [] }])

    const abort = new AbortController()
    abortRef.current = abort

    let resolvedSessionId = sessionId

    try {
      await aliceAPI.streamMessage(
        {
          message: query,
          session_id: sessionId || undefined,
          create_new_session: !sessionId,
        },
        (event: StreamEvent) => {
          if (event.type === "session") {
            resolvedSessionId = event.session_id
            if (!sessionId) {
              setSessionId(event.session_id)
              setActiveSessionId(event.session_id)
            }
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
            // Refresh sessions sidebar after first message
            loadSessions()
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
  }, [input, loading, sessionId, loadSessions])

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setInput(v)
    setShowSlash(v.startsWith("/"))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === "Escape") setShowSlash(false)
  }

  const startNewSession = useCallback(() => {
    stopStream()
    setSessionId("")
    setActiveSessionId("")
    setBlocks([])
    inputRef.current?.focus()
  }, [stopStream])

  return (
    <div className="relative -mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] overflow-hidden flex">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col shrink-0 border-r border-border/40 bg-muted/20 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/40 shrink-0">
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Conversas</span>
          <button
            onClick={loadSessions}
            disabled={sessionsLoading}
            title="Atualizar"
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", sessionsLoading && "animate-spin")} />
          </button>
        </div>

        <button
          onClick={startNewSession}
          className="mx-3 mt-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border/60 text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Nova conversa
        </button>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {sessionsLoading && sessions.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!sessionsLoading && sessions.length === 0 && (
            <div className="text-center py-8 text-[11px] text-muted-foreground/60">
              <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-30" />
              Sem conversas ainda
            </div>
          )}

          {sessions.map(s => (
            <div
              key={s.session_id}
              role="button"
              tabIndex={0}
              onClick={() => loadSession(s.session_id)}
              onKeyDown={e => e.key === "Enter" && loadSession(s.session_id)}
              className={cn(
                "group w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-start gap-2 cursor-pointer",
                activeSessionId === s.session_id
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3 h-3 shrink-0 mt-1 opacity-50" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium leading-snug line-clamp-2 text-left">
                  {s.title === "Nova conversa" ? "Nova conversa" : s.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-2.5 h-2.5 opacity-40" />
                  <span className="text-[10px] opacity-50">{relativeTime(s.updated_at)}</span>
                  <span className="text-[10px] opacity-40">· {s.message_count} msg</span>
                </div>
              </div>
              <button
                onClick={e => deleteSession(e, s.session_id)}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
                title="Apagar"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-6 py-3 shrink-0 z-10 border-b border-border/40">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={sidebarOpen ? "Ocultar histórico" : "Mostrar histórico"}
          >
            {sidebarOpen
              ? <PanelLeftClose className="w-4 h-4" />
              : <PanelLeftOpen className="w-4 h-4" />
            }
          </button>

          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl grid place-items-center shadow-lg shadow-primary/30"
              style={{ background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)" }}
            >
              <AliceFaceIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight leading-none">Alice</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">RAG · base de conhecimento corporativo</p>
            </div>
          </div>

          <div className="flex-1" />

          <Badge variant="outline" className="gap-1.5 font-normal">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              <span className="relative rounded-full bg-emerald-500 w-1.5 h-1.5" />
            </span>
            <span className="text-[11px]">
              RAG · <span className="font-medium text-foreground">{contextTag}</span>
            </span>
          </Badge>

          <Button variant="ghost" size="icon" onClick={startNewSession} disabled={loading} title="Nova sessão">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </header>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={cn(
            "flex-1 px-6 scroll-smooth",
            blocks.length > 0 || loading ? "overflow-y-auto pb-48" : "overflow-hidden"
          )}
        >
          <div className="max-w-3xl mx-auto flex flex-col">
            {blocks.length === 0 && !loading && <Hero onPick={send} />}

            {blocks.map(b =>
              b.role === "user"
                ? <UserBlock key={b.id} text={b.text} />
                : <AliceBlock key={b.id} block={b} onFollowup={send} />
            )}
          </div>
        </div>

        {/* Floating composer */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[min(720px,calc(100%-48px))] z-20">
          {showSlash && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-popover border rounded-xl shadow-lg overflow-hidden p-1.5 animate-in slide-in-from-bottom-2 duration-150">
              {SLASH_COMMANDS.filter(s => s.cmd.startsWith(input.toLowerCase())).map(s => (
                <button
                  key={s.cmd}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted w-full text-left transition-colors"
                  onClick={() => { setInput(s.cmd + " "); setShowSlash(false); inputRef.current?.focus() }}
                >
                  <span className="w-7 h-7 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                    <s.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{s.cmd}</span>
                    <span className="block text-xs text-muted-foreground">{s.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="bg-popover/90 border rounded-2xl shadow-lg overflow-hidden backdrop-blur-xl focus-within:border-primary focus-within:shadow-[0_0_0_3px_oklch(from_var(--primary)_l_c_h/0.15)] transition-all">
            {/* Context toolbar */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-border/60">
              {[
                { k: "todos"     as const, icon: Database,      label: "todos" },
                { k: "tutoriais" as const, icon: GraduationCap, label: "tutoriais" },
                { k: "cursos"    as const, icon: Video,         label: "cursos" },
                { k: "manuais"   as const, icon: BookText,      label: "manuais" },
              ].map(t => (
                <button
                  key={t.k}
                  onClick={() => setContextTag(t.k)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] transition-colors",
                    contextTag === t.k
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <t.icon className="w-3 h-3" />
                  {t.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => inputRef.current?.focus()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Comandos slash"
              >
                <Slash className="w-3 h-3" /> /
              </button>
              <button
                onClick={() => setVoiceActive(v => !v)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  voiceActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {voiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Input */}
            <div className="flex items-end gap-2.5 px-3.5 py-2.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                placeholder="Pergunte à Alice — pesquisa em documentos, manuais, tutoriais…"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-snug min-h-[24px] max-h-[140px] placeholder:text-muted-foreground/60"
                autoFocus
              />
              <Button
                size="icon"
                onClick={loading ? stopStream : () => send()}
                disabled={!loading && !input.trim()}
                className="h-9 w-9 rounded-xl shrink-0"
                title={loading ? "Parar" : "Enviar"}
              >
                {loading ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────
function Hero({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="min-h-[55vh] flex flex-col justify-center items-center text-center py-10 gap-6 animate-in fade-in duration-500">
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full grid place-items-center shadow-2xl shadow-primary/30 ring-1 ring-white/20 animate-[orbFloat_6s_ease-in-out_infinite]"
          style={{ background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)" }}
        >
          <AliceFaceIcon className="w-12 h-12" />
        </div>
        <div className="absolute inset-[-18px] rounded-full border border-primary/15 animate-[orbRing_4s_ease-out_infinite]" />
        <div className="absolute inset-[-36px] rounded-full border border-primary/10 animate-[orbRing_4s_ease-out_infinite]" style={{ animationDelay: "1s" }} />
      </div>

      <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance max-w-lg leading-tight">
        Oi, sou a{" "}
        <span className="italic font-medium bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent [font-family:ui-serif,Georgia,serif] px-1">
          Alice
        </span>
        .<br />
        O que vamos descobrir hoje?
      </h2>

      <p className="text-sm text-muted-foreground max-w-md">
        Busco em manuais, tutoriais e cursos usando IA. Cito as fontes de cada resposta.
      </p>

      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        {SUGGESTED.map(c => (
          <button
            key={c.label}
            onClick={() => onPick(c.q)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border hover:border-primary hover:bg-primary/5 hover:text-primary hover:-translate-y-0.5 transition-all text-[12.5px]"
          >
            <c.icon className="w-3.5 h-3.5 text-primary" />
            {c.label}
          </button>
        ))}
      </div>

      <style jsx>{`
        @keyframes orbFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes orbRing { 0% { opacity: 0.6; transform: scale(0.95); } 100% { opacity: 0; transform: scale(1.2); } }
      `}</style>
    </div>
  )
}

function UserBlock({ text }: { text: string }) {
  return (
    <div className="relative pl-6 ml-2 py-4 border-l-2 border-dashed border-border animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="absolute -left-[5px] top-6 w-2 h-2 rounded-full bg-foreground ring-[3px] ring-background" />
      <div className="text-lg font-medium tracking-tight leading-snug py-1">{text}</div>
    </div>
  )
}

function AliceBlock({
  block,
  onFollowup,
}: {
  block: Extract<Block, { role: "alice" }>
  onFollowup: (q: string) => void
}) {
  return (
    <div className="relative pl-6 ml-2 py-4 border-l-2 border-dashed border-border animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className={cn(
        "absolute -left-[5px] top-6 w-2 h-2 rounded-full ring-[3px] ring-background",
        block.streaming ? "bg-primary animate-pulse" : "bg-primary"
      )} />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
        <span
          className="w-[18px] h-[18px] rounded-md grid place-items-center"
          style={{ background: "linear-gradient(135deg, #5e6ad2, #7c3aed)" }}
        >
          <AliceFaceIcon className="w-3.5 h-3.5" />
        </span>
        {block.error ? "Erro" : "Alice"}
        {block.streaming && (
          <span className="normal-case tracking-normal font-normal text-primary animate-pulse">
            pensando…
          </span>
        )}
      </div>

      {/* Tool calls */}
      {block.toolCalls && block.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {[...new Set(block.toolCalls)].map(t => (
            <ToolCallBadge key={t} tool={t} />
          ))}
        </div>
      )}

      {/* Response text */}
      <div className={cn(
        "text-base leading-relaxed text-pretty max-w-xl mb-3",
        block.error && "text-destructive"
      )}>
        {block.text ? formatMsg(block.text) : null}
        {block.streaming && (
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
        )}
      </div>

      {/* Sources */}
      {!block.streaming && block.sources && block.sources.length > 0 && (
        <SourcesWidget sources={block.sources} />
      )}

      {/* Actions */}
      {!block.streaming && block.text && !block.error && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => navigator.clipboard?.writeText(block.text)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copiar
          </button>
        </div>
      )}
    </div>
  )
}
