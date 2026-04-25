"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts"
import {
  BookOpen, FileText, GraduationCap, ListChecks,
  Plus, ArrowRight, TrendingUp, Activity,
  Clock, CheckCircle2, Users, BarChart3,
  Search,
} from "lucide-react"
import { getTutorials } from "@/lib/api/tutorials"
import { getManuals } from "@/lib/api/manuals"
import { getCourses } from "@/lib/api/courses"
import { getTags } from "@/lib/api/tags"
import { getSectors } from "@/lib/api/sectors"
import { cn } from "@/lib/utils"
import type { TutorialListItem } from "@/types/tutorial.types"

interface DashStats {
  tutorials: number
  tutorialsActive: number
  tutorialSteps: number
  manuals: number
  courses: number
  tags: number
  sectors: number
  tutorialsBySector: { name: string; total: number }[]
  tutorialsByTag: { name: string; color: string; total: number }[]
  contentDistribution: { name: string; value: number; color: string }[]
  recentTutorials: TutorialListItem[]
  activity: { day: string; value: number }[]
}

const EMPTY: DashStats = {
  tutorials: 0, tutorialsActive: 0, tutorialSteps: 0, manuals: 0, courses: 0,
  tags: 0, sectors: 0, tutorialsBySector: [], tutorialsByTag: [],
  contentDistribution: [], recentTutorials: [], activity: [],
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [tutsRes, manualsRes, coursesRes, tagsRes, sectorsRes] = await Promise.allSettled([
          getTutorials({ page_size: 100 }),
          getManuals({ page_size: 100 }),
          getCourses({ page_size: 100 }),
          getTags({ page_size: 100 }),
          getSectors({ page_size: 100 }),
        ])
        const tuts = tutsRes.status === "fulfilled" ? tutsRes.value.results : []
        const tutCount = tutsRes.status === "fulfilled" ? (tutsRes.value.count ?? tuts.length) : 0
        const manualsCount = manualsRes.status === "fulfilled" ? (manualsRes.value.count ?? 0) : 0
        const coursesCount = coursesRes.status === "fulfilled" ? (coursesRes.value.count ?? 0) : 0
        const tagsCount = tagsRes.status === "fulfilled" ? (tagsRes.value.count ?? 0) : 0
        const sectorsCount = sectorsRes.status === "fulfilled" ? (sectorsRes.value.count ?? 0) : 0

        const sectorMap: Record<string, number> = {}
        tuts.forEach((t) => {
          const s = t.sector_detail?.name ?? "Sem setor"
          sectorMap[s] = (sectorMap[s] ?? 0) + 1
        })
        const tutorialsBySector = Object.entries(sectorMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)

        const tagMap: Record<string, { total: number; color: string }> = {}
        tuts.forEach((t) => t.tags_detail?.forEach((tag) => {
          if (!tagMap[tag.name]) tagMap[tag.name] = { total: 0, color: tag.color }
          tagMap[tag.name].total += 1
        }))
        const tutorialsByTag = Object.entries(tagMap).map(([name, { total, color }]) => ({ name, total, color })).sort((a, b) => b.total - a.total).slice(0, 6)

        const tutorialSteps = tuts.reduce((acc, t) => acc + (t.step_count ?? 0), 0)

        const contentDistribution = [
          { name: "Tutoriais", value: tutCount, color: "#5e6ad2" },
          { name: "Manuais", value: manualsCount, color: "#7170ff" },
          { name: "Cursos", value: coursesCount, color: "#10b981" },
        ].filter((d) => d.value > 0)

        // mocked activity trend
        const days = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]
        const activity = days.map((day, i) => ({
          day,
          value: Math.max(2, Math.round(10 + Math.sin(i) * 6 + Math.random() * 8)),
        }))

        setStats({
          tutorials: tutCount,
          tutorialsActive: tuts.filter((t) => t.is_active).length,
          tutorialSteps, manuals: manualsCount, courses: coursesCount,
          tags: tagsCount, sectors: sectorsCount,
          tutorialsBySector, tutorialsByTag, contentDistribution,
          recentTutorials: tuts.slice(0, 5),
          activity,
        })
      } catch (err) {
        console.error("Dashboard load error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="relative pb-10 animate-in fade-in duration-300">
      {/* ── KPI row — hero stat + small stats ────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-4 mb-6">
        {/* Hero stat: tutoriais */}
        <Link
          href="/tutoriais"
          className="group relative overflow-hidden rounded-2xl border bg-card p-6 hover:border-primary/40 transition-all duration-150"
        >
          <div className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-70" />
          <div className="relative flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <Badge variant="secondary" className="text-[10.5px] gap-1">
              <TrendingUp className="w-2.5 h-2.5" /> +12%
            </Badge>
          </div>
          <div className="relative flex items-baseline gap-2">
            <div className="text-6xl font-semibold tracking-tight tabular-nums leading-none">{stats.tutorials}</div>
            <div className="text-sm text-muted-foreground mb-1">tutoriais</div>
          </div>
          <div className="relative text-[13px] text-muted-foreground mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {stats.tutorialsActive} ativos
            </span>
            <span className="flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" />
              {stats.tutorialSteps} passos
            </span>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        <SmallKpi href="/manuais" icon={FileText} label="Manuais" value={stats.manuals} sub="documentos" accent="violet" />
        <SmallKpi href="/cursos" icon={BookOpen} label="Cursos" value={stats.courses} sub="com prova" accent="emerald" />
        <SmallKpi icon={Users} label="Setores" value={stats.sectors} sub={`${stats.tags} tags`} accent="amber" />
      </section>

      {/* ── Activity + distribution ──────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Activity area chart */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-2">
                <Activity className="w-3 h-3" /> Atividade dos últimos 7 dias
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-1">
                {stats.activity.reduce((a, b) => a + b.value, 0)}
                <span className="text-sm text-muted-foreground font-normal ml-2">consultas</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10.5px]"><TrendingUp className="w-2.5 h-2.5 mr-1 text-emerald-500" />+18% vs semana anterior</Badge>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.activity} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)" }} />
              <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#gradA)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-2 mb-3">
            <BarChart3 className="w-3 h-3" /> Conteúdo por tipo
          </div>
          {stats.contentDistribution.length === 0 ? (
            <EmptyChart />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={stats.contentDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={66} dataKey="value" paddingAngle={4}>
                    {stats.contentDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {stats.contentDistribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground flex-1">{d.name}</span>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Sector bars + recent tutorials ──────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
              Tutoriais por setor
            </div>
            <Link href="/setores" className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.tutorialsBySector.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="space-y-2.5">
              {stats.tutorialsBySector.slice(0, 6).map((s, i) => {
                const max = stats.tutorialsBySector[0].total
                return (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-foreground/80">{s.name}</span>
                      <span className="font-semibold tabular-nums">{s.total}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                        style={{ width: `${(s.total / max) * 100}%`, animationDelay: `${i * 60}ms` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent tutorials — 3 col */}
        <div className="lg:col-span-3 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
              Atualizados recentemente
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/tutoriais">Ver todos <ArrowRight className="ml-1 w-3 h-3" /></Link>
            </Button>
          </div>
          {stats.recentTutorials.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-sm text-muted-foreground mb-3">Nenhum tutorial cadastrado ainda.</div>
              <Button size="sm" asChild>
                <Link href="/tutoriais/novo"><Plus className="w-3.5 h-3.5 mr-1" />Criar tutorial</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
              {stats.recentTutorials.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/tutoriais/${t.id}`}
                  className={cn(
                    "group flex items-center gap-3 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors -mx-5 px-5 first:-mt-1",
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-primary">{t.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{t.sector_detail?.name}</span>
                      <span className="opacity-50">·</span>
                      <Clock className="w-3 h-3" />
                      <span>{t.step_count} passos</span>
                      {t.tags_detail?.slice(0, 1).map((tag) => (
                        <span key={tag.id} className="px-1.5 py-0.5 rounded text-[10px] text-white" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Badge
                    variant={t.is_active ? "default" : "secondary"}
                    className={cn("text-[10px]", t.is_active && "bg-emerald-500 hover:bg-emerald-500")}
                  >
                    {t.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────
function SmallKpi({
  icon: Icon, label, value, sub, href, accent,
}: {
  icon: any; label: string; value: number; sub: string; href?: string; accent: "violet" | "emerald" | "amber" | "primary"
}) {
  const accentCls = {
    violet: "bg-[#7170ff]/15 text-[#828fff]",
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
    primary: "bg-primary/15 text-primary",
  }[accent]

  const inner = (
    <div className="relative h-full rounded-2xl border bg-card p-5 hover:border-primary/40 transition-all group">
      <div className={cn("w-9 h-9 rounded-xl grid place-items-center mb-3", accentCls)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-3xl font-semibold tabular-nums tracking-tight leading-none">{value}</div>
      <div className="text-sm font-medium mt-1.5">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      {href && <ArrowRight className="absolute top-5 right-5 w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />}
    </div>
  )
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2 text-sm text-muted-foreground/60">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Search className="w-4 h-4" />
      </div>
      <span>Sem dados para exibir</span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-32 rounded-2xl bg-muted/50" />
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-muted/50" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-56 rounded-2xl bg-muted/50" />
        <div className="h-56 rounded-2xl bg-muted/50" />
      </div>
    </div>
  )
}
