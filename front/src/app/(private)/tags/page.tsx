"use client"

import React, { useState, useEffect, useCallback } from "react"
import { DataTable } from "@/components/ui/data-table"
import TagForm from "@/components/forms/TagForm"
import { getTags, createTag, updateTag, deleteTag } from "@/lib/api/tags"
import { toast } from "@/hooks/use-toast"
import type { Tag, TagFormData } from "@/types/tag.types"
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

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [ordering, setOrdering] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)

  // Fetch tags
  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getTags({
        page: pageIndex + 1,
        page_size: pageSize,
        search: searchQuery || undefined,
        ordering: ordering || undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter,
      })
      setTags(response.results)
      setTotalCount(response.count)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar tags",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [pageIndex, pageSize, searchQuery, ordering, statusFilter])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Handle create/update
  const handleSubmit = async (data: TagFormData) => {
    try {
      if (selectedTag) {
        await updateTag(selectedTag.id, data)
        toast({
          title: "Sucesso",
          description: "Tag atualizada com sucesso!",
        })
      } else {
        await createTag(data)
        toast({
          title: "Sucesso",
          description: "Tag criada com sucesso!",
        })
      }
      fetchTags()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar tag",
        variant: "destructive",
      })
      throw error
    }
  }

  // Handle inactivate (soft delete)
  const handleDelete = async () => {
    if (!tagToDelete) return

    try {
      await deleteTag(tagToDelete.id)
      toast({
        title: "Sucesso",
        description: "Tag inativada com sucesso!",
      })
      fetchTags()
      setIsDeleteDialogOpen(false)
      setTagToDelete(null)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao inativar tag",
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
  const columns: ColumnDef<Tag>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      meta: {
        showFilterIcon: true,
        filterType: "text",
      },
    },
    {
      accessorKey: "color",
      header: "Cor",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full border border-gray-300"
            style={{ backgroundColor: row.original.color }}
          />
          <span className="text-sm text-gray-600">{row.original.color}</span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.is_active
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
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
        data={tags}
        title="Tags"
        subtitle="Gerencie as tags do sistema"
        pageSize={pageSize}
        pageIndex={pageIndex}
        totalCount={totalCount}
        onPageChange={setPageIndex}
        onPageSizeChange={setPageSize}
        onAdd={() => {
          setSelectedTag(null)
          setIsFormOpen(true)
        }}
        onEdit={(row) => {
          setSelectedTag(row)
          setIsFormOpen(true)
        }}
        onDelete={(row) => {
          setTagToDelete(row)
          setIsDeleteDialogOpen(true)
        }}
        onFilterChange={handleFilterChange}
        onSortingChange={handleSortingChange}
      />

      {/* Form Dialog */}
      <TagForm
        open={isFormOpen}
        handleClose={() => {
          setIsFormOpen(false)
          setSelectedTag(null)
        }}
        initialData={selectedTag}
        onSubmit={handleSubmit}
      />

      {/* Inactivate Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar a tag "{tagToDelete?.name}"?
              A tag ficará invisível mas poderá ser reativada posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTagToDelete(null)}>
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
