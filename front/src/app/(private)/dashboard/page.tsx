"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  BookOpen, FileText, GraduationCap, ListChecks,
  Plus, ArrowRight,
} from "lucide-react"
import { getTutorials } from "@/lib/api/tutorials"
import { getManuals } from "@/lib/api/manuals"
import { getCourses } from "@/lib/api/courses"
import { getTags } from "@/lib/api/tags"
import { getSectors } from "@/lib/api/sectors"
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
}

const EMPTY: DashStats = {
  tutorials: 0,
  tutorialsActive: 0,
  tutorialSteps: 0,
  manuals: 0,
  courses: 0,
  tags: 0,
  sectors: 0,
  tutorialsBySector: [],
  tutorialsByTag: [],
  contentDistribution: [],
  recentTutorials: [],
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

        // Tutoriais por setor
        const sectorMap: Record<string, number> = {}
        tuts.forEach((t) => {
          const s = t.sector_detail?.name ?? "Sem setor"
          sectorMap[s] = (sectorMap[s] ?? 0) + 1
        })
        const tutorialsBySector = Object.entries(sectorMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)

        // Tutoriais por tag (top 6)
        const tagMap: Record<string, { total: number; color: string }> = {}
        tuts.forEach((t) => {
          t.tags_detail?.forEach((tag) => {
            if (!tagMap[tag.name]) tagMap[tag.name] = { total: 0, color: tag.color }
            tagMap[tag.name].total += 1
          })
        })
        const tutorialsByTag = Object.entries(tagMap)
          .map(([name, { total, color }]) => ({ name, total, color }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 6)

        // Total de passos (sum de step_count)
        const tutorialSteps = tuts.reduce((acc, t) => acc + (t.step_count ?? 0), 0)

        // Distribuição de conteúdo
        const contentDistribution = [
          { name: "Tutoriais", value: tutCount, color: "#3b82f6" },
          { name: "Manuais", value: manualsCount, color: "#8b5cf6" },
          { name: "Cursos", value: coursesCount, color: "#10b981" },
        ].filter((d) => d.value > 0)

        setStats({
          tutorials: tutCount,
          tutorialsActive: tuts.filter((t) => t.is_active).length,
          tutorialSteps,
          manuals: manualsCount,
          courses: coursesCount,
          tags: tagsCount,
          sectors: sectorsCount,
          tutorialsBySector,
          tutorialsByTag,
          contentDistribution,
          recentTutorials: tuts.slice(0, 5),
        })
      } catch (err) {
        console.error("Dashboard load error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton dos KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-9 w-9 bg-muted rounded-xl" />
                  <div className="h-7 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Skeleton dos gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-border/60">
            <CardContent className="p-5">
              <div className="animate-pulse h-56 bg-muted rounded-lg" />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="animate-pulse h-56 bg-muted rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
          label="Tutoriais"
          value={stats.tutorials}
          sub={`${stats.tutorialsActive} ativos`}
          color="blue"
          href="/tutoriais"
        />
        <KpiCard
          icon={<ListChecks className="h-5 w-5 text-indigo-500" />}
          label="Passos criados"
          value={stats.tutorialSteps}
          sub="em todos os tutoriais"
          color="indigo"
        />
        <KpiCard
          icon={<FileText className="h-5 w-5 text-purple-500" />}
          label="Manuais"
          value={stats.manuals}
          sub="documentos PDF"
          color="purple"
          href="/manuais"
        />
        <KpiCard
          icon={<GraduationCap className="h-5 w-5 text-emerald-500" />}
          label="Cursos"
          value={stats.courses}
          sub="com provas e certificados"
          color="emerald"
          href="/cursos"
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar: tutoriais por setor */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Tutoriais por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.tutorialsBySector.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.tutorialsBySector} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={140}
                    tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                  />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Tutoriais" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie: distribuição de conteúdo */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Conteúdo por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.contentDistribution.length === 0 ? (
              <EmptyChart />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={stats.contentDistribution}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {stats.contentDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {stats.contentDistribution.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tutoriais Recentes ───────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Tutoriais Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link href="/tutoriais">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.recentTutorials.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum tutorial cadastrado ainda.
              <div className="mt-3">
                <Button size="sm" asChild>
                  <Link href="/tutoriais/novo"><Plus className="mr-1 h-3.5 w-3.5" />Criar Tutorial</Link>
                </Button>
              </div>
            </div>
          ) : (
            stats.recentTutorials.map((t) => (
              <Link
                key={t.id}
                href={`/tutoriais/${t.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-primary">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{t.sector_detail?.name}</span>
                    {t.tags_detail?.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-xs px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground">{t.step_count} passos</span>
                  <Badge
                    variant={t.is_active ? "default" : "secondary"}
                    className={`text-xs ${t.is_active ? "bg-green-500" : ""}`}
                  >
                    {t.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, color, href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
  color: string
  href?: string
}) {
  const colorMap: Record<string, string> = {
    blue:    "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    indigo:  "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    purple:  "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  }

  const inner = (
    /* Altura fixa garante alinhamento uniforme dos 4 cards */
    <CardContent className="p-5 flex flex-col h-full min-h-[120px]">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 w-fit ${colorMap[color]}`}>{icon}</div>
      <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
      <div className="text-sm font-medium mt-1 text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </CardContent>
  )

  return (
    <Card className={`border-border/60 ${href ? "hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer" : ""}`}>
      {href ? <Link href={href} className="block h-full">{inner}</Link> : inner}
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-sm text-muted-foreground/60">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-lg">—</span>
      </div>
      <span>Sem dados para exibir</span>
    </div>
  )
}
