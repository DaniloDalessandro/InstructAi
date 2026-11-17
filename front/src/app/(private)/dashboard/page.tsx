"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Area, AreaChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  BookOpen, GraduationCap, Activity, Search,
  Award, BookText, CheckCircle2, BarChart3, ArrowRight, Clock,
} from "lucide-react"
import { getTutorials } from "@/lib/api/tutorials"
import { getManuals } from "@/lib/api/manuals"
import { getCourses, getDashboardStats } from "@/lib/api/courses"
import type { DashboardStats } from "@/lib/api/courses"

interface ContentStats {
  tutorials: number
  tutorialsActive: number
  tutorialSteps: number
  manuals: number
  courses: number
  contentDistribution: { name: string; value: number; color: string }[]
}

const EMPTY: ContentStats = {
  tutorials: 0, tutorialsActive: 0, tutorialSteps: 0,
  manuals: 0, courses: 0, contentDistribution: [],
}

export default function DashboardPage() {
  const [content, setContent] = useState<ContentStats>(EMPTY)
  const [courseStats, setCourseStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [tutsRes, manualsRes, coursesRes, statsRes] = await Promise.allSettled([
          getTutorials({ page_size: 100 }),
          getManuals({ page_size: 100 }),
          getCourses({ page_size: 100 }),
          getDashboardStats(),
        ])

        const tuts        = tutsRes.status        === "fulfilled" ? tutsRes.value.results          : []
        const tutCount    = tutsRes.status        === "fulfilled" ? (tutsRes.value.count ?? 0)     : 0
        const manualsCount = manualsRes.status    === "fulfilled" ? (manualsRes.value.count ?? 0)  : 0
        const coursesCount = coursesRes.status    === "fulfilled" ? (coursesRes.value.count ?? 0)  : 0

        const tutorialSteps = tuts.reduce((acc, t) => acc + (t.step_count ?? 0), 0)

        const contentDistribution = [
          { name: "Tutoriais", value: tutCount,    color: "#5e6ad2" },
          { name: "Manuais",   value: manualsCount, color: "#7170ff" },
          { name: "Cursos",    value: coursesCount, color: "#10b981" },
        ].filter((d) => d.value > 0)

        setContent({
          tutorials: tutCount,
          tutorialsActive: tuts.filter((t) => t.is_active).length,
          tutorialSteps,
          manuals: manualsCount,
          courses: coursesCount,
          contentDistribution,
        })

        if (statsRes.status === "fulfilled") setCourseStats(statsRes.value)
      } catch (err) {
        console.error("Dashboard load error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <DashboardSkeleton />

  const totalActivity = courseStats?.activity.reduce((a, b) => a + b.value, 0) ?? 0

  return (
    <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col gap-4 p-4 md:p-6 overflow-hidden animate-in fade-in duration-300">

      {/* ── Linha 1: 4 KPI cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">

        <Link href="/tutoriais" className="group relative overflow-hidden rounded-2xl border bg-card px-5 py-4 hover:border-primary/40 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tutoriais</span>
          </div>
          <div className="text-3xl font-semibold tabular-nums tracking-tight">{content.tutorials}</div>
          <div className="text-xs text-muted-foreground mt-1 flex gap-2">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{content.tutorialsActive} ativos</span>
            <span>· {content.tutorialSteps} passos</span>
          </div>
          <ArrowRight className="absolute top-4 right-4 w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link href="/manuais" className="group relative rounded-2xl border bg-card px-5 py-4 hover:border-primary/40 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#7170ff]/15 text-[#828fff] grid place-items-center shrink-0">
              <BookText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manuais</span>
          </div>
          <div className="text-3xl font-semibold tabular-nums tracking-tight">{content.manuals}</div>
          <div className="text-xs text-muted-foreground mt-1">documentos PDF</div>
          <ArrowRight className="absolute top-4 right-4 w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link href="/cursos" className="group relative rounded-2xl border bg-card px-5 py-4 hover:border-primary/40 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 grid place-items-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cursos</span>
          </div>
          <div className="text-3xl font-semibold tabular-nums tracking-tight">{content.courses}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {courseStats ? `${courseStats.courses.with_exam} com prova final` : "—"}
          </div>
          <ArrowRight className="absolute top-4 right-4 w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        <div className="rounded-2xl border bg-card px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 grid place-items-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Certificados</span>
          </div>
          <div className="text-3xl font-semibold tabular-nums tracking-tight">{courseStats?.certificates.total ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">emitidos no total</div>
        </div>
      </section>

      {/* ── Linha 2: Charts — expande para preencher o espaço restante ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">

        {/* Atividade — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 flex flex-col min-h-0">
          <div className="flex items-start justify-between mb-3 shrink-0">
            <div>
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-2">
                <Activity className="w-3 h-3" /> Aulas concluídas — últimos 7 dias
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-1">
                {totalActivity}
                <span className="text-sm text-muted-foreground font-normal ml-2">aulas</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {totalActivity === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-muted-foreground/60">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <span>Nenhuma atividade no período</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={courseStats?.activity ?? []} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)" }}
                    formatter={(v) => [v ?? 0, "aulas concluídas"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#gradA)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribuição de conteúdo — 1/3 */}
        <div className="rounded-2xl border bg-card p-5 flex flex-col min-h-0">
          <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-2 mb-3 shrink-0">
            <BarChart3 className="w-3 h-3" /> Conteúdo por tipo
          </div>

          {content.contentDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-sm text-muted-foreground/60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <span>Sem dados para exibir</span>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={content.contentDistribution}
                      cx="50%" cy="50%"
                      innerRadius="38%" outerRadius="60%"
                      dataKey="value"
                      paddingAngle={4}
                    >
                      {content.contentDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-2 mt-3 shrink-0">
                {content.contentDistribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground flex-1">{d.name}</span>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col gap-4 p-4 md:p-6 overflow-hidden animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        <Skeleton className="lg:col-span-2 rounded-2xl" />
        <Skeleton className="rounded-2xl" />
      </div>
    </div>
  )
}
