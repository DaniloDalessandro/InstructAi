"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ManualFilters, ManualFiltersState } from "@/components/manual/ManualFilters"
import ManualForm from "@/components/forms/ManualForm"
import { getManuals, deleteManual } from "@/lib/api/manuals"
import { toast } from "@/hooks/use-toast"
import type { Manual, ManualFormData } from "@/types/manual.types"
import { createManual, updateManual } from "@/lib/api/manuals"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Grid3x3, List, Search,
  FileText, Clock, Pencil, Trash2,
  Eye, CheckCircle2, XCircle, SortAsc, ArrowUpRight,
  ExternalLink, BookOpen,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type ViewMode = "gallery" | "list"
type SortMode = "recent" | "alpha"

const SECTOR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-fuchsia-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
]

function sectorColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % SECTOR_COLORS.length
}

export default function ManuaisPage() {
  const [manuals, setManuals] = useState<Manual[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<ManualFiltersState>({ search: "", sectors: [], tags: [] })
  const [view, setView] = useState<ViewMode>("gallery")
  const [sort, setSort] = useState<SortMode>("recent")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isFormLoading, setIsFormLoading] = useState(false)
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [manualToDelete, setManualToDelete] = useState<Manual | null>(null)

  const fetchManuals = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getManuals({
        search: filters.search || undefined,
        sectors: filters.sectors.length > 0 ? filters.sectors : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        is_active: "true",
        page_size: 100,
      })
      setManuals(response.results)
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar manuais", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const t = setTimeout(fetchManuals, 300)
    return () => clearTimeout(t)
  }, [fetchManuals])

  const sortedManuals = useMemo(() => {
    return [...manuals].sort((a, b) => {
      if (sort === "alpha") return a.name.localeCompare(b.name)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [manuals, sort])

  const hasFilters = !!filters.search || filters.sectors.length > 0 || filters.tags.length > 0

  const handleSubmit = async (data: ManualFormData) => {
    setIsFormLoading(true)
    try {
      if (selectedManual) {
        await updateManual(selectedManual.id, data)
        toast({ title: "Sucesso", description: "Manual atualizado com sucesso!" })
      } else {
        await createManual(data)
        toast({ title: "Sucesso", description: "Manual criado com sucesso!" })
      }
      await fetchManuals()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar manual", variant: "destructive" })
      throw error
    } finally {
      setIsFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!manualToDelete) return
    try {
      await deleteManual(manualToDelete.id)
      toast({ title: "Sucesso", description: "Manual inativado com sucesso!" })
      fetchManuals()
      setIsDeleteDialogOpen(false)
      setManualToDelete(null)
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao inativar manual", variant: "destructive" })
    }
  }

  const handleView = (manual: Manual) => {
    if (manual.pdf_url) {
      window.open(manual.pdf_url, "_blank")
    } else {
      toast({ title: "PDF não disponível", variant: "destructive" })
    }
  }

  return (
    <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

      {/* ── Header + Toolbar fixos ─────────────────────────── */}
      <div className="px-4 pt-6 pb-3 md:px-6 space-y-4 shrink-0 animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manuais</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Documentos e manuais organizados por setor
            </p>
          </div>
          <Button
            size="sm"
            className="h-9 shrink-0 bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
            onClick={() => { setSelectedManual(null); setIsFormOpen(true) }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Manual
          </Button>
        </div>

        {/* Toolbar */}
        <div className="rounded-xl border bg-card/80 backdrop-blur shadow-sm px-3 py-2.5 flex flex-col gap-2">
          {/* Filtros */}
          <ManualFilters filters={filters} onFiltersChange={setFilters} />

          <div className="h-px bg-border/60" />

          {/* Sort + View + Counter */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border bg-background/60 p-0.5">
                {(["recent", "alpha"] as SortMode[]).map((s) => (
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
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center rounded-lg border bg-background/60 p-0.5">
                <button onClick={() => setView("gallery")} className={cn("p-1.5 rounded-md transition-all", view === "gallery" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Galeria">
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Lista">
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {!isLoading && manuals.length > 0 && (
              <p className="text-xs text-muted-foreground animate-in fade-in duration-200">
                <span className="font-semibold text-foreground tabular-nums">{manuals.length}</span>{" "}
                {manuals.length === 1 ? "manual" : "manuais"}
                {hasFilters && <span className="ml-1 text-primary/70">· filtros ativos</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Área scrollável ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        {isLoading ? (
          <SkeletonGrid />
        ) : manuals.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onNew={() => { setSelectedManual(null); setIsFormOpen(true) }} />
        ) : view === "gallery" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedManuals.map((m) => (
              <ManualGalleryCard
                key={m.id}
                manual={m}
                hovered={hoveredId === m.id}
                onHover={setHoveredId}
                onView={() => handleView(m)}
                onEdit={() => { setSelectedManual(m); setIsFormOpen(true) }}
                onDelete={() => { setManualToDelete(m); setIsDeleteDialogOpen(true) }}
              />
            ))}
          </div>
        ) : (
          <ManualListView
            manuals={sortedManuals}
            onView={handleView}
            onEdit={(m) => { setSelectedManual(m); setIsFormOpen(true) }}
            onDelete={(m) => { setManualToDelete(m); setIsDeleteDialogOpen(true) }}
          />
        )}
      </div>

      {/* Form Dialog */}
      <ManualForm
        open={isFormOpen}
        handleClose={() => { setIsFormOpen(false); setSelectedManual(null) }}
        initialData={selectedManual}
        onSubmit={handleSubmit}
      />

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar o manual <strong>"{manualToDelete?.name}"</strong>? Ele ficará invisível mas poderá ser reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setManualToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Inativar
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
function ManualGalleryCard({
  manual: m, hovered, onHover, onView, onEdit, onDelete,
}: {
  manual: Manual
  hovered: boolean
  onHover: (id: string | null) => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const createdDays = Math.round((Date.now() - new Date(m.created_at).getTime()) / 86400000)
  const updatedDays = Math.round((Date.now() - new Date(m.updated_at).getTime()) / 86400000)
  const freshness = updatedDays < 7 ? "novo" : updatedDays < 30 ? "atualizado" : null
  const firstSector = m.sectors_detail?.[0]
  const gradientClass = SECTOR_COLORS[sectorColorIndex(firstSector?.name ?? "")]
  const createdLabel = createdDays === 0 ? "hoje" : createdDays === 1 ? "há 1 dia" : `há ${createdDays} dias`

  return (
    <article
      onMouseEnter={() => onHover(m.id)}
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
          "relative w-full flex items-center justify-center px-5 py-6 overflow-hidden shrink-0 text-left",
          gradientClass
        )}
        tabIndex={-1}
        aria-hidden
      >
        <span className="relative z-10 text-sm font-semibold text-white leading-snug line-clamp-3">
          {m.name}
        </span>
      </button>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Setores + freshness */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {m.sectors_detail?.slice(0, 2).map((sector) => (
            <Badge key={sector.id} variant="outline" className="h-5 text-[10px] font-normal gap-1 px-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {sector.name}
            </Badge>
          ))}
          {(m.sectors_detail?.length ?? 0) > 2 && (
            <span className="text-[10px] text-muted-foreground">+{(m.sectors_detail?.length ?? 0) - 2}</span>
          )}
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

        {/* Nome */}
        <button onClick={onView} className="text-left">
          <h3 className="text-[14px] font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {m.name}
          </h3>
        </button>

        {/* Tags */}
        {(m.tags_detail?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {m.tags_detail?.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white leading-none"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {(m.tags_detail?.length ?? 0) > 3 && (
              <span className="text-[10px] text-muted-foreground">+{(m.tags_detail?.length ?? 0) - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-2.5 border-t space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Criado {createdLabel}</span>
            <ArrowUpRight
              className={cn(
                "w-3.5 h-3.5 ml-auto transition-all duration-200",
                hovered ? "text-primary translate-x-0.5 -translate-y-0.5" : "text-muted-foreground/30"
              )}
            />
          </div>
          {m.created_by && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-3 h-3 shrink-0 inline-flex items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                {m.created_by.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">Por {m.created_by}</span>
            </div>
          )}
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
          onClick={(e) => { e.stopPropagation(); onView() }}
          className="w-7 h-7 grid place-items-center rounded-md bg-background/90 backdrop-blur border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          title="Abrir PDF"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
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
          title="Inativar"
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
function ManualListView({
  manuals, onView, onEdit, onDelete,
}: {
  manuals: Manual[]
  onView: (m: Manual) => void
  onEdit: (m: Manual) => void
  onDelete: (m: Manual) => void
}) {
  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur overflow-hidden shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/50 text-[10.5px] uppercase tracking-widest font-semibold text-muted-foreground border-b">
        <span>Nome</span>
        <span className="hidden md:block w-36">Setores</span>
        <span className="hidden md:block w-28">Atualizado</span>
        <span className="hidden md:block w-16 text-center">Status</span>
        <span className="w-24" />
      </div>

      {manuals.map((m) => {
        const updatedDays = Math.round((Date.now() - new Date(m.updated_at).getTime()) / 86400000)
        const firstSector = m.sectors_detail?.[0]
        const gradientClass = SECTOR_COLORS[sectorColorIndex(firstSector?.name ?? "")]

        return (
          <div
            key={m.id}
            className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onView(m)}
          >
            {/* Nome + tags */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-9 h-9 rounded-xl shrink-0 grid place-items-center", gradientClass)}>
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {m.name}
                  </span>
                  {m.is_active
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    : <XCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                  }
                </div>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {m.tags_detail?.slice(0, 3).map((tag) => (
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

            {/* Setores */}
            <div className="hidden md:flex w-36 flex-wrap gap-1">
              {m.sectors_detail?.slice(0, 2).map((sector) => (
                <span key={sector.id} className="text-xs text-muted-foreground truncate">
                  {sector.name}
                </span>
              ))}
            </div>

            {/* Data */}
            <span className="hidden md:inline-flex w-28 text-xs text-muted-foreground">
              {updatedDays === 0 ? "hoje" : updatedDays === 1 ? "ontem" : `há ${updatedDays}d`}
            </span>

            {/* Status */}
            <span className="hidden md:inline-flex w-16 justify-center">
              <Badge
                variant={m.is_active ? "default" : "secondary"}
                className={cn("text-[10px] h-5 px-1.5", m.is_active ? "bg-emerald-500" : "bg-muted text-muted-foreground")}
              >
                {m.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </span>

            {/* Ações */}
            <div className="w-24 flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onView(m) }}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Abrir PDF"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(m) }}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(m) }}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Inativar"
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
          <div className="h-[88px] bg-muted/70" />
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
function EmptyState({ hasFilters, onNew }: { hasFilters: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-card/40 backdrop-blur text-center gap-5 animate-in fade-in duration-300">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 grid place-items-center shadow-inner">
        {hasFilters
          ? <Search className="w-8 h-8 text-primary/50" />
          : <FileText className="w-8 h-8 text-primary/50" />
        }
      </div>
      <div className="max-w-xs">
        <h3 className="font-semibold text-foreground mb-1.5 text-base">
          {hasFilters ? "Nenhum manual encontrado" : "Comece sua biblioteca"}
        </h3>
        <p className="text-sm text-muted-foreground text-balance leading-relaxed">
          {hasFilters
            ? "Tente ajustar ou limpar os filtros para ver mais resultados."
            : "Organize documentos e manuais por setor. Fácil de encontrar, fácil de compartilhar."}
        </p>
      </div>
      {!hasFilters && (
        <Button
          size="sm"
          className="bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/20"
          onClick={onNew}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Novo Manual
        </Button>
      )}
    </div>
  )
}
