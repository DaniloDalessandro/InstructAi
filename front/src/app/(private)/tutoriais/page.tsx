"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TutorialFilters, type TutorialFiltersState } from "@/components/tutorial/TutorialFilters"
import { getTutorials, deleteTutorial } from "@/lib/api/tutorials"
import { toast } from "@/hooks/use-toast"
import type { TutorialListItem } from "@/types/tutorial.types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Grid3x3, List, Search,
  GraduationCap, Clock, ListChecks, Pencil, Trash2,
  Eye, CheckCircle2, XCircle, SortAsc, ArrowUpRight,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type ViewMode = "gallery" | "list"
type SortMode = "recent" | "alpha" | "steps"

// Gradient palette keyed by sector — each sector always maps to the same color
const SECTOR_COLORS = [
  "from-violet-500 via-purple-500 to-indigo-600",
  "from-sky-500 via-blue-500 to-cyan-600",
  "from-emerald-500 via-teal-500 to-green-600",
  "from-rose-500 via-pink-500 to-red-600",
  "from-amber-500 via-orange-500 to-yellow-600",
  "from-fuchsia-500 via-pink-500 to-purple-600",
  "from-cyan-500 via-sky-500 to-blue-600",
  "from-lime-500 via-green-500 to-emerald-600",
  "from-red-500 via-rose-500 to-pink-600",
  "from-teal-500 via-cyan-500 to-sky-600",
  "from-indigo-500 via-violet-500 to-purple-600",
  "from-orange-500 via-amber-500 to-yellow-600",
]

function sectorColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % SECTOR_COLORS.length
}

export default function TutoriaisPage() {
  const router = useRouter()
  const [tutorials, setTutorials] = useState<TutorialListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<TutorialFiltersState>({ search: "", sectors: [], tags: [] })
  const [view, setView] = useState<ViewMode>("gallery")
  const [sort, setSort] = useState<SortMode>("recent")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tutorialToDelete, setTutorialToDelete] = useState<TutorialListItem | null>(null)

  const fetchTutorials = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getTutorials({
        search: filters.search || undefined,
        sector: filters.sectors.length > 0 ? filters.sectors.join(",") : undefined,
        tags: filters.tags.length > 0 ? filters.tags.join(",") : undefined,
        is_active: "true",
        page_size: 100,
      })
      setTutorials(response.results)
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao carregar tutoriais", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const t = setTimeout(fetchTutorials, 300)
    return () => clearTimeout(t)
  }, [fetchTutorials])

  const sortedTutorials = useMemo(() => {
    return [...tutorials].sort((a, b) => {
      if (sort === "alpha") return a.title.localeCompare(b.title)
      if (sort === "steps") return (b.step_count ?? 0) - (a.step_count ?? 0)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [tutorials, sort])

  const hasFilters = !!filters.search || filters.sectors.length > 0 || filters.tags.length > 0

  const handleDelete = async () => {
    if (!tutorialToDelete) return
    try {
      await deleteTutorial(tutorialToDelete.id)
      toast({ title: "Sucesso", description: "Tutorial excluído com sucesso!" })
      fetchTutorials()
      setIsDeleteDialogOpen(false)
      setTutorialToDelete(null)
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir tutorial", variant: "destructive" })
    }
  }

  return (
    <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

      {/* ── Header + Toolbar fixos ─────────────────────────── */}
      <div className="px-4 pt-6 pb-3 md:px-6 space-y-4 shrink-0 animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tutoriais</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tutoriais passo a passo para facilitar seu aprendizado
            </p>
          </div>
          <Link href="/tutoriais/novo" target="_blank">
            <Button size="sm" className="h-9 shrink-0 bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Tutorial
            </Button>
          </Link>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2">
          <div className="flex-1">
            <TutorialFilters filters={filters} onFiltersChange={setFilters} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border bg-card/80 backdrop-blur p-0.5 shadow-sm">
                {(["recent", "alpha", "steps"] as SortMode[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all",
                      sort === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {s === "recent" && <><Clock className="w-3 h-3" /> Recentes</>}
                    {s === "alpha" && <><SortAsc className="w-3 h-3" /> A–Z</>}
                    {s === "steps" && <><ListChecks className="w-3 h-3" /> + passos</>}
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center rounded-lg border bg-card/80 backdrop-blur p-0.5 shadow-sm">
                <button onClick={() => setView("gallery")} className={cn("p-1.5 rounded-md transition-all", view === "gallery" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Galeria">
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Lista">
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {!isLoading && tutorials.length > 0 && (
              <p className="text-xs text-muted-foreground animate-in fade-in duration-200">
                <span className="font-semibold text-foreground tabular-nums">{tutorials.length}</span>{" "}
                {tutorials.length === 1 ? "tutorial" : "tutoriais"}
                {hasFilters && <span className="ml-1 text-primary/70">· filtros ativos</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Área scrollável — apenas os cards ─────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        {isLoading ? (
          <SkeletonGrid />
        ) : tutorials.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : view === "gallery" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedTutorials.map((t) => (
              <TutorialCard
                key={t.id}
                tutorial={t}
                hovered={hoveredId === t.id}
                onHover={setHoveredId}
                onView={() => router.push(`/tutoriais/${t.id}`)}
                onEdit={() => router.push(`/tutoriais/${t.id}/editar`)}
                onDelete={() => { setTutorialToDelete(t); setIsDeleteDialogOpen(true) }}
              />
            ))}
          </div>
        ) : (
          <TutorialListView
            tutorials={sortedTutorials}
            onView={(t) => router.push(`/tutoriais/${t.id}`)}
            onEdit={(t) => router.push(`/tutoriais/${t.id}/editar`)}
            onDelete={(t) => { setTutorialToDelete(t); setIsDeleteDialogOpen(true) }}
          />
        )}

      </div>

      {/* ── Delete dialog ──────────────────────────────────── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tutorial <strong>"{tutorialToDelete?.title}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTutorialToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Gallery Card
// ────────────────────────────────────────────────────────────
function TutorialCard({
  tutorial: t, hovered, onHover, onView, onEdit, onDelete,
}: {
  tutorial: TutorialListItem
  hovered: boolean
  onHover: (id: string | null) => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const updatedDays = Math.round((Date.now() - new Date(t.updated_at).getTime()) / 86400000)
  const freshness = updatedDays < 7 ? "novo" : updatedDays < 30 ? "atualizado" : null
  const sectorName = t.sector_detail?.name ?? "—"
  const gradientClass = SECTOR_COLORS[sectorColorIndex(t.sector_detail?.name ?? "")]

  return (
    <article
      onMouseEnter={() => onHover(t.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-300",
        "hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5",
      )}
    >
      {/* Thumbnail */}
      <button
        onClick={onView}
        className={cn(
          "relative w-full bg-gradient-to-br",
          gradientClass,
          "flex items-center justify-center px-5 py-6 overflow-hidden shrink-0 text-left"
        )}
        tabIndex={-1}
        aria-hidden
      >
        {/* Decorative circles */}
        <span className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <span className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-black/10" />

        <span className="relative z-10 text-sm font-semibold text-white leading-snug line-clamp-3 drop-shadow">
          {t.title}
        </span>

        {/* Step count pill overlaid */}
        <span className="absolute bottom-2.5 right-3 z-10 inline-flex items-center gap-1 bg-black/30 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
          <ListChecks className="w-3 h-3" />
          {t.step_count ?? 0}
        </span>
      </button>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Sector + freshness */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="h-5 text-[10px] font-normal gap-1 px-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            {sectorName}
          </Badge>
          {freshness && (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 text-[10px] font-medium border-0 px-1.5",
                freshness === "novo"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              )}
            >
              {freshness}
            </Badge>
          )}
        </div>

        {/* Title */}
        <button onClick={onView} className="text-left">
          <h3 className="text-[14px] font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {t.title}
          </h3>
        </button>

        {/* Description */}
        {t.description && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {t.description}
          </p>
        )}

        {/* Tags */}
        {(t.tags_detail?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {t.tags_detail?.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white leading-none"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {(t.tags_detail?.length ?? 0) > 3 && (
              <span className="text-[10px] text-muted-foreground">+{(t.tags_detail?.length ?? 0) - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto pt-2.5 border-t">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{updatedDays === 0 ? "hoje" : updatedDays === 1 ? "ontem" : `há ${updatedDays}d`}</span>
          <ArrowUpRight
            className={cn(
              "w-3.5 h-3.5 ml-auto transition-all duration-200",
              hovered ? "text-primary translate-x-0.5 -translate-y-0.5" : "text-muted-foreground/30"
            )}
          />
        </div>
      </div>

      {/* Hover actions */}
      <div
        className={cn(
          "absolute top-2.5 right-2.5 flex items-center gap-1 transition-all duration-200",
          hovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
        )}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="w-7 h-7 grid place-items-center rounded-md bg-background/90 backdrop-blur border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          title="Editar"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-7 h-7 grid place-items-center rounded-md bg-background/90 backdrop-blur border shadow-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </article>
  )
}

// ────────────────────────────────────────────────────────────
// List view
// ────────────────────────────────────────────────────────────
function TutorialListView({
  tutorials, onView, onEdit, onDelete,
}: {
  tutorials: TutorialListItem[]
  onView: (t: TutorialListItem) => void
  onEdit: (t: TutorialListItem) => void
  onDelete: (t: TutorialListItem) => void
}) {
  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur overflow-hidden shadow-sm">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/50 text-[10.5px] uppercase tracking-widest font-semibold text-muted-foreground border-b">
        <span>Título</span>
        <span className="hidden md:block w-32">Setor</span>
        <span className="hidden md:block w-20 text-center">Passos</span>
        <span className="hidden md:block w-28">Atualizado</span>
        <span className="w-20" />
      </div>

      {tutorials.map((t) => {
        const updatedDays = Math.round((Date.now() - new Date(t.updated_at).getTime()) / 86400000)
        const gradientClass = SECTOR_COLORS[sectorColorIndex(t.sector_detail?.name ?? "")]

        return (
          <div
            key={t.id}
            className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onView(t)}
          >
            {/* Title + tags */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-xl bg-gradient-to-br shrink-0 grid place-items-center",
                gradientClass
              )}>
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {t.title}
                  </span>
                  {t.is_active ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {t.tags_detail?.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sector */}
            <span className="hidden md:inline-flex w-32 text-xs text-muted-foreground truncate">
              {t.sector_detail?.name ?? "—"}
            </span>

            {/* Steps */}
            <span className="hidden md:inline-flex w-20 justify-center">
              <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-foreground/80">
                <ListChecks className="w-3 h-3 text-primary" />
                {t.step_count ?? 0}
              </span>
            </span>

            {/* Date */}
            <span className="hidden md:inline-flex w-28 text-xs text-muted-foreground">
              {updatedDays === 0 ? "hoje" : updatedDays === 1 ? "ontem" : `há ${updatedDays}d`}
            </span>

            {/* Actions */}
            <div className="w-20 flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onView(t) }}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Ver"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(t) }}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(t) }}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton loading
// ────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card overflow-hidden">
          {/* Thumbnail placeholder */}
          <div className="h-[88px] bg-muted/70" />
          {/* Body placeholder */}
          <div className="p-4 space-y-2.5">
            <div className="flex gap-1.5">
              <div className="h-5 bg-muted rounded-full w-20" />
            </div>
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-3.5 bg-muted rounded w-3/4" />
            <div className="flex gap-1 pt-1">
              <div className="h-4 bg-muted rounded-md w-12" />
              <div className="h-4 bg-muted rounded-md w-14" />
            </div>
            <div className="h-px bg-muted rounded mt-2" />
            <div className="h-3 bg-muted rounded w-24 mt-1" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-card/40 backdrop-blur text-center gap-5 animate-in fade-in duration-300">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 grid place-items-center shadow-inner">
        {hasFilters ? (
          <Search className="w-8 h-8 text-primary/50" />
        ) : (
          <GraduationCap className="w-8 h-8 text-primary/50" />
        )}
      </div>
      <div className="max-w-xs">
        <h3 className="font-semibold text-foreground mb-1.5 text-base">
          {hasFilters ? "Nenhum tutorial encontrado" : "Comece sua biblioteca"}
        </h3>
        <p className="text-sm text-muted-foreground text-balance leading-relaxed">
          {hasFilters
            ? "Tente ajustar ou limpar os filtros para ver mais resultados."
            : "Documente processos em passos claros. Tutoriais bem feitos economizam horas de suporte."}
        </p>
      </div>
      {!hasFilters && (
        <Button size="sm" className="bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/20" asChild>
          <Link href="/tutoriais/novo" target="_blank">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Criar tutorial
          </Link>
        </Button>
      )}
    </div>
  )
}
