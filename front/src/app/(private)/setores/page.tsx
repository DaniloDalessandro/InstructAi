"use client"

import React, { useState, useEffect, useCallback } from "react"
import { DataTable } from "@/components/ui/data-table"
import SectorForm from "@/components/forms/SectorForm"
import { getSectors, createSector, updateSector, deleteSector } from "@/lib/api/sectors"
import { toast } from "@/hooks/use-toast"
import type { Sector, SectorFormData } from "@/types/sector.types"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [ordering, setOrdering] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null)

  // Fetch sectors
  const fetchSectors = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getSectors({
        page: pageIndex + 1,
        page_size: pageSize,
        search: searchQuery || undefined,
        ordering: ordering || undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter,
      })
      setSectors(response.results)
      setTotalCount(response.count)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar setores",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [pageIndex, pageSize, searchQuery, ordering, statusFilter])

  useEffect(() => {
    fetchSectors()
  }, [fetchSectors])

  // Handle create/update
  const handleSubmit = async (data: SectorFormData) => {
    try {
      if (selectedSector) {
        await updateSector(selectedSector.id, data)
        toast({
          title: "Sucesso",
          description: "Setor atualizado com sucesso!",
        })
      } else {
        await createSector(data)
        toast({
          title: "Sucesso",
          description: "Setor criado com sucesso!",
        })
      }
      fetchSectors()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar setor",
        variant: "destructive",
      })
      throw error
    }
  }

  // Handle inactivate (soft delete)
  const handleDelete = async () => {
    if (!sectorToDelete) return

    try {
      await deleteSector(sectorToDelete.id)
      toast({
        title: "Sucesso",
        description: "Setor inativado com sucesso!",
      })
      fetchSectors()
      setIsDeleteDialogOpen(false)
      setSectorToDelete(null)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao inativar setor",
        variant: "destructive",
      })
    }
  }

  // Handle filter change
  const handleFilterChange = (columnId: string, value: any) => {
    if (columnId === "name") {
      setSearchQuery(value)
      setPageIndex(0)
    } else if (columnId === "is_active") {
      setStatusFilter(value)
      setPageIndex(0)
    }
  }

  // Handle sorting change
  const handleSortingChange = (sorting: any[]) => {
    if (sorting.length > 0) {
      const sort = sorting[0]
      const orderingValue = sort.desc ? `-${sort.id}` : sort.id
      setOrdering(orderingValue)
    } else {
      setOrdering("")
    }
    setPageIndex(0)
  }

  // Table columns
  const columns: ColumnDef<Sector>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      meta: {
        showFilterIcon: true,
        filterType: "text",
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.is_active ? "Ativo" : "Inativo"}
        </span>
      ),
      meta: {
        showFilterIcon: true,
        filterType: "select",
        filterOptions: [
          { value: "all", label: "Todos" },
          { value: "true", label: "Ativo" },
          { value: "false", label: "Inativo" },
        ],
      },
    },
    {
      accessorKey: "created_by",
      header: "Criado por",
      cell: ({ row }) => row.original.created_by || "-",
    },
    {
      accessorKey: "created_at",
      header: "Criado em",
      cell: ({ row }) =>
        row.original.created_at
          ? new Date(row.original.created_at).toLocaleDateString("pt-BR")
          : "-",
    },
    {
      accessorKey: "updated_by",
      header: "Atualizado por",
      cell: ({ row }) => row.original.updated_by || "-",
    },
    {
      accessorKey: "updated_at",
      header: "Atualizado em",
      cell: ({ row }) =>
        row.original.updated_at
          ? new Date(row.original.updated_at).toLocaleDateString("pt-BR")
          : "-",
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <DataTable
        columns={columns}
        data={sectors}
        title="Setores"
        subtitle="Gerencie os setores do sistema"
        pageSize={pageSize}
        pageIndex={pageIndex}
        totalCount={totalCount}
        onPageChange={setPageIndex}
        onPageSizeChange={setPageSize}
        onAdd={() => {
          setSelectedSector(null)
          setIsFormOpen(true)
        }}
        onEdit={(row) => {
          setSelectedSector(row)
          setIsFormOpen(true)
        }}
        onDelete={(row) => {
          setSectorToDelete(row)
          setIsDeleteDialogOpen(true)
        }}
        onFilterChange={handleFilterChange}
        onSortingChange={handleSortingChange}
      />

      {/* Form Dialog */}
      <SectorForm
        open={isFormOpen}
        handleClose={() => {
          setIsFormOpen(false)
          setSelectedSector(null)
        }}
        initialData={selectedSector}
        onSubmit={handleSubmit}
      />

      {/* Inactivate Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar o setor "{sectorToDelete?.name}"?
              O setor ficará invisível mas poderá ser reativado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSectorToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-orange-600 hover:bg-orange-700">
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
