"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Play,
  Mic,
  MicOff,
  Database,
  GraduationCap,
  Video,
  BarChart3,
  Search,
  Download,
  Table as TableIcon,
  BookText,
  Building2,
  Loader2,
  Slash,
  ChevronRight,
  ExternalLink,
  Square,
} from "lucide-react"
import { aliceAPI, type ChatResponse } from "@/lib/api/alice"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type Block =
  | { id: string; role: "user"; text: string }
  | {
      id: string
      role: "alice"
      query: string
      text: string
      sql?: string
      time?: number
      count?: number
      kind?: "stat" | "bars" | "table" | "list" | null
      data?: any
      error?: boolean
    }

// ────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────
const SUGGESTED = [
  { icon: BarChart3, label: "Quantos tutoriais ativos?", q: "Quantos tutoriais temos ativos?" },
  { icon: TableIcon, label: "Cursos mais acessados", q: "Mostre os cursos mais acessados" },
  { icon: Building2, label: "Setor com mais conteúdo", q: "Qual setor tem mais conteúdo?" },
  { icon: Search, label: "Tutoriais sobre LGPD", q: "Encontre tutoriais sobre LGPD" },
]

const SLASH_COMMANDS = [
  { cmd: "/tutoriais", icon: GraduationCap, desc: "Buscar em tutoriais" },
  { cmd: "/cursos", icon: Video, desc: "Consultar cursos e provas" },
  { cmd: "/manuais", icon: BookText, desc: "Buscar em manuais" },
  { cmd: "/setor", icon: Building2, desc: "Filtrar por setor" },
  { cmd: "/analise", icon: BarChart3, desc: "Gerar análise visual" },
  { cmd: "/exportar", icon: Download, desc: "Exportar último resultado" },
]

// Detects result shape from ChatResponse.data
function detectKind(resp: ChatResponse): {
  kind: Block extends { kind: infer K } ? K : never
  data: any
} {
  const rows = Array.isArray(resp.data) ? resp.data : []
  if (rows.length === 0) return { kind: null as any, data: null }
  if (rows.length === 1 && Object.keys(rows[0]).length === 1) {
    const [k, v] = Object.entries(rows[0])[0]
    if (typeof v === "number") return { kind: "stat", data: { big: v, label: k } }
  }
  const first = rows[0]
  const keys = Object.keys(first)
  const numericKey = keys.find((k) => typeof first[k] === "number")
  const nameKey = keys.find((k) => typeof first[k] === "string")
  if (rows.length <= 10 && numericKey && nameKey && keys.length === 2) {
    return {
      kind: "bars",
      data: { bars: rows.map((r: any) => ({ name: r[nameKey], total: r[numericKey] })) },
    }
  }
  if (keys.length >= 3) {
    return { kind: "table", data: { rows } }
  }
  return { kind: "list", data: { items: rows } }
}

// Bold markdown (**text**) renderer
function formatMsg(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

// ────────────────────────────────────────────────────────────
// Result widgets
// ────────────────────────────────────────────────────────────
function StatWidget({ big, label }: { big: number; label: string }) {
  return (
    <div className="px-6 py-5 flex items-baseline gap-3 bg-gradient-to-br from-primary/10 to-transparent">
      <div className="text-5xl font-bold tabular-nums leading-none tracking-tight text-primary">
        {big.toLocaleString("pt-BR")}
      </div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  )
}

function BarsWidget({ bars }: { bars: { name: string; total: number }[] }) {
  const max = Math.max(...bars.map((b) => b.total), 1)
  return (
    <div className="p-4 grid gap-2">
      {bars.map((b) => (
        <div key={b.name} className="grid grid-cols-[110px_1fr_40px] gap-3 items-center">
          <span className="text-xs text-muted-foreground text-right truncate">{b.name}</span>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
              style={{ width: `${(b.total / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums">{b.total}</span>
        </div>
      ))}
    </div>
  )
}

function TableWidget({ rows }: { rows: any[] }) {
  const keys = Object.keys(rows[0] ?? {})
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            {keys.map((k) => (
              <th
                key={k}
                className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b"
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              {keys.map((k) => (
                <td key={k} className="px-4 py-2.5">
                  {typeof r[k] === "number" ? (
                    <span className="font-semibold tabular-nums">{r[k]}</span>
                  ) : (
                    <span>{String(r[k] ?? "—")}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListWidget({ items }: { items: any[] }) {
  return (
    <div className="flex flex-col">
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {it.title || it.name || Object.values(it)[0]}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              {Object.entries(it)
                .slice(1, 4)
                .map(([k, v]) => (
                  <span key={k}>
                    {k}: <span className="text-foreground/70">{String(v)}</span>
                  </span>
                ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function ResultWidget({ kind, data }: { kind: Block extends { kind: infer K } ? K : never; data: any }) {
  if (!kind || !data) return null
  if (kind === "stat") return <StatWidget {...data} />
  if (kind === "bars") return <BarsWidget bars={data.bars} />
  if (kind === "table") return <TableWidget rows={data.rows} />
  if (kind === "list") return <ListWidget items={data.items} />
  return null
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
  const canvasRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // autoscroll
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTo({
        top: canvasRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [blocks, loading])

  // autoresize textarea
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = "auto"
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px"
  }, [input])

  const send = useCallback(
    async (q?: string) => {
      const query = (q ?? input).trim()
      if (!query || loading) return

      setInput("")
      setShowSlash(false)
      const userBlock: Block = { id: `u-${Date.now()}`, role: "user", text: query }
      setBlocks((b) => [...b, userBlock])
      setLoading(true)

      try {
        const resp = await aliceAPI.sendMessage({
          message: query,
          session_id: sessionId || undefined,
          create_new_session: !sessionId,
        })

        if (!sessionId && resp.session_id) setSessionId(resp.session_id)

        if (resp.success) {
          const { kind, data } = detectKind(resp)
          setBlocks((b) => [
            ...b,
            {
              id: `a-${Date.now()}`,
              role: "alice",
              query,
              text: resp.response,
              sql: resp.sql_query,
              time: resp.execution_time_ms,
              count: resp.result_count,
              kind,
              data,
            },
          ])
        } else {
          setBlocks((b) => [
            ...b,
            {
              id: `e-${Date.now()}`,
              role: "alice",
              query,
              text: resp.response || resp.error || "Erro desconhecido",
              error: true,
            },
          ])
        }
      } catch (err) {
        setBlocks((b) => [
          ...b,
          {
            id: `e-${Date.now()}`,
            role: "alice",
            query,
            text: "Erro de conexão com o servidor. Tente novamente.",
            error: true,
          },
        ])
      } finally {
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    },
    [input, loading, sessionId]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setInput(v)
    setShowSlash(v.startsWith("/"))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
    if (e.key === "Escape") setShowSlash(false)
  }

  const startNewSession = () => {
    setSessionId("")
    setBlocks([])
    inputRef.current?.focus()
  }

  return (
    <div
      className="relative -mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col"
    >
      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-6 py-3 shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-500 grid place-items-center text-white shadow-lg shadow-primary/30 animate-[shimmer_6s_ease-in-out_infinite]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight leading-none">Alice</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">co-pilot do conhecimento</p>
          </div>
        </div>
        <div className="flex-1" />
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            <span className="relative rounded-full bg-emerald-500 w-1.5 h-1.5" />
          </span>
          <span className="text-[11px]">
            Sessão · base <span className="font-medium text-foreground">{contextTag}</span>
          </span>
        </Badge>
        <Button variant="ghost" size="icon" onClick={startNewSession} disabled={loading} title="Nova sessão">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </header>

      {/* ── Canvas ─────────────────────────────────────────── */}
      <div ref={canvasRef} className={cn("flex-1 px-6 scroll-smooth", blocks.length > 0 || loading ? "overflow-y-auto pb-48" : "overflow-hidden")}>
        <div className="max-w-3xl mx-auto flex flex-col">
          {blocks.length === 0 && !loading && <Hero onPick={send} />}

          {blocks.map((b) =>
            b.role === "user" ? (
              <UserBlock key={b.id} text={b.text} />
            ) : (
              <AliceBlock key={b.id} block={b} onFollowup={send} />
            )
          )}

          {loading && <ThinkingBlock />}
        </div>
      </div>

      {/* ── Floating composer ─────────────────────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[min(720px,calc(100%-48px))] z-20">
        {showSlash && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-popover border rounded-xl shadow-lg overflow-hidden p-1.5 animate-in slide-in-from-bottom-2 duration-150">
            {SLASH_COMMANDS.filter((s) => s.cmd.startsWith(input.toLowerCase())).map((s) => (
              <button
                key={s.cmd}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted w-full text-left transition-colors"
                onClick={() => {
                  setInput(s.cmd + " ")
                  setShowSlash(false)
                  inputRef.current?.focus()
                }}
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
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-border/60">
            {[
              { k: "todos" as const, icon: Database, label: "todos os dados" },
              { k: "tutoriais" as const, icon: GraduationCap, label: "tutoriais" },
              { k: "cursos" as const, icon: Video, label: "cursos" },
              { k: "manuais" as const, icon: BookText, label: "manuais" },
            ].map((t) => (
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
              onClick={() => setVoiceActive((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                voiceActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Voz"
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
              placeholder="Pergunte à Alice — digite / para comandos…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-snug min-h-[24px] max-h-[140px] placeholder:text-muted-foreground/60"
              autoFocus
            />
            <Button
              size="icon"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="h-9 w-9 rounded-xl shrink-0"
            >
              {loading ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.15) saturate(1.15); }
        }
      `}</style>
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
        <div className="w-20 h-20 rounded-full grid place-items-center text-white shadow-2xl shadow-primary/30 bg-[radial-gradient(circle_at_30%_30%,oklch(from_var(--primary)_calc(l+0.15)_c_h),var(--primary)_60%,oklch(0.58_0.22_310)_100%)] animate-[orbFloat_6s_ease-in-out_infinite] ring-1 ring-white/20">
          <Sparkles className="w-8 h-8" strokeWidth={1.8} />
        </div>
        <div className="absolute inset-[-18px] rounded-full border border-primary/15 animate-[orbRing_4s_ease-out_infinite]" />
        <div
          className="absolute inset-[-36px] rounded-full border border-primary/10 animate-[orbRing_4s_ease-out_infinite]"
          style={{ animationDelay: "1s" }}
        />
      </div>
      <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance max-w-lg leading-tight">
        Oi, sou a{" "}
        <span className="italic font-medium bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent [font-family:ui-serif,Georgia,serif] px-1">
          Alice
        </span>
        .
        <br />O que vamos descobrir hoje?
      </h2>

      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        {SUGGESTED.map((c) => (
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
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes orbRing {
          0% { opacity: 0.6; transform: scale(0.95); }
          100% { opacity: 0; transform: scale(1.2); }
        }
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

function AliceBlock({ block, onFollowup }: { block: Extract<Block, { role: "alice" }>; onFollowup: (q: string) => void }) {
  const [sqlCollapsed, setSqlCollapsed] = useState(false)

  const followupMap: Record<string, string[]> = {
    stat: ["Mostrar por setor", "Comparar com mês passado", "Exportar"],
    bars: ["Top 3 apenas", "Converter em tabela", "Ver detalhes"],
    table: ["Filtrar por setor", "Agrupar por mês", "Download CSV"],
    list: ["Ver mais 5", "Filtrar ativos", "Abrir no editor"],
  }
  const followups = block.kind ? followupMap[block.kind] : []

  return (
    <div className="relative pl-6 ml-2 py-4 border-l-2 border-dashed border-border animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="absolute -left-[5px] top-6 w-2 h-2 rounded-full bg-primary ring-[3px] ring-background" />

      <div className="flex items-center gap-2 mb-2.5 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
        <span className="w-[18px] h-[18px] rounded-md bg-gradient-to-br from-primary to-purple-500 grid place-items-center text-white">
          <Sparkles className="w-2.5 h-2.5" />
        </span>
        {block.error ? "Erro" : "Alice respondeu"}
        {block.time != null && (
          <span className="ml-auto normal-case tracking-normal text-muted-foreground/70 font-normal font-mono">
            {block.time}ms{block.count != null && ` · ${block.count} resultado${block.count !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      <div
        className={cn(
          "text-base leading-relaxed text-pretty max-w-xl mb-3",
          block.error && "text-destructive"
        )}
      >
        {formatMsg(block.text)}
      </div>

      {/* Result widget */}
      {block.kind && block.data && (
        <div className="mb-3">
          <div className="border rounded-2xl overflow-hidden bg-card hover:border-primary/40 hover:-translate-y-0.5 transition-all">
            <div className="px-3.5 pt-2.5 pb-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground font-medium">
              {block.kind === "stat" && <BarChart3 className="w-3 h-3 text-primary" />}
              {block.kind === "bars" && <BarChart3 className="w-3 h-3 text-primary" />}
              {block.kind === "table" && <TableIcon className="w-3 h-3 text-primary" />}
              {block.kind === "list" && <GraduationCap className="w-3 h-3 text-primary" />}
              {block.kind === "stat"
                ? "Métrica"
                : block.kind === "bars"
                ? "Distribuição"
                : block.kind === "table"
                ? "Tabela"
                : "Lista"}
            </div>
            <ResultWidget kind={block.kind} data={block.data} />
          </div>
        </div>
      )}

      {/* SQL block */}
      {block.sql && (
        <div className="bg-[oklch(0.15_0.015_264)] rounded-xl border border-white/5 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary-foreground/90 text-[10px] font-mono">
              sql
            </span>
            <span className="text-[10.5px] text-white/50 font-mono flex-1">
              consulta gerada{block.time != null && ` · ${block.time}ms`}
            </span>
            <button
              className="p-1 rounded hover:bg-white/10 text-white/70"
              onClick={() => navigator.clipboard?.writeText(block.sql || "")}
              title="Copiar"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              className="p-1 rounded hover:bg-white/10 text-white/70"
              onClick={() => setSqlCollapsed((s) => !s)}
              title={sqlCollapsed ? "Expandir" : "Recolher"}
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", !sqlCollapsed && "rotate-90")} />
            </button>
          </div>
          {!sqlCollapsed && (
            <pre className="px-3.5 py-3 font-mono text-xs leading-relaxed overflow-x-auto text-cyan-200/90 whitespace-pre">
              {block.sql}
            </pre>
          )}
        </div>
      )}

      {/* Followups */}
      {followups && followups.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {followups.map((f) => (
            <button
              key={f}
              onClick={() => onFollowup(f)}
              className="px-2.5 py-1.5 rounded-full border text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ThinkingBlock() {
  return (
    <div className="relative pl-6 ml-2 py-4 border-l-2 border-dashed border-border animate-in fade-in duration-200">
      <div className="absolute -left-[5px] top-6 w-2 h-2 rounded-full bg-primary ring-[3px] ring-background animate-pulse" />
      <div className="flex items-center gap-2 mb-2.5 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
        <span className="w-[18px] h-[18px] rounded-md bg-gradient-to-br from-primary to-purple-500 grid place-items-center text-white">
          <Sparkles className="w-2.5 h-2.5" />
        </span>
        Alice está pensando
      </div>
      <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-card border text-muted-foreground text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>gerando SQL · consultando base · formatando resultado</span>
      </div>
    </div>
  )
}
