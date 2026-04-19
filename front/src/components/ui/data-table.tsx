"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash,
  Filter,
  X,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnDef } from "@tanstack/react-table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  title?: string;
  subtitle?: string;
  pageSize?: number;
  pageIndex?: number;
  totalCount?: number;
  initialFilters?: any[];
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onAdd?: () => void;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  onViewDetails?: (row: TData) => void;
  onFilterChange?: (columnId: string, value: any) => void;
  onSortingChange?: (sorting: any[]) => void;
  readOnly?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  title,
  subtitle,
  pageSize = 10,
  pageIndex = 0,
  totalCount = 0,
  initialFilters = [],
  onPageChange,
  onPageSizeChange,
  onAdd,
  onEdit,
  onDelete,
  onViewDetails,
  onFilterChange,
  onSortingChange,
  readOnly = false,
}: DataTableProps<TData>) {
  // Initialize column visibility with audit fields hidden by default
  const getInitialColumnVisibility = React.useCallback(() => {
    const hiddenByDefaultFields = [
      // Audit fields
      'created_at', 'criado_em', 'createdAt',
      'created_by', 'criado_por', 'createdBy', 
      'updated_at', 'atualizado_em', 'updatedAt',
      'updated_by', 'atualizado_por', 'updatedBy',
      // Budget Lines secondary fields
      'management_center.name',
      'requesting_center.name',
      'expense_type',
      'contract_type',
      'probable_procurement_type',
      'main_fiscal.full_name',
      'secondary_fiscal.full_name',
      'process_status',
      // Optional fields that should be hidden by default
      'phone', 'telefone',
      // Auxílios optional fields
      'id',
      'installment_count',
      'amount_per_installment', 
      'start_date',
      'end_date',
      'budget_line.name',
      'notes',
      // Contratos optional fields
      'substitute_inspector.full_name',
      'original_value',
      'current_value',
      'expiration_date',
      'signing_date',
      'description'
    ];
    
    const initialVisibility: Record<string, boolean> = {};
    columns.forEach(column => {
      const columnId = ('accessorKey' in column ? column.accessorKey : column.id) as string;
      const headerText = (column.header || '').toString().toLowerCase();

      // Check if this field should be hidden by default
      const shouldHide = hiddenByDefaultFields.some(field =>
        columnId === field ||
        headerText.includes('criado') ||
        headerText.includes('atualizado') ||
        headerText.includes('created') ||
        headerText.includes('updated') ||
        headerText.includes('telefone')
      );

      if (shouldHide) {
        initialVisibility[columnId] = false;
      }
    });
    
    return initialVisibility;
  }, [columns]);

  const [columnVisibility, setColumnVisibility] = React.useState(() => getInitialColumnVisibility());
  const [selectedRow, setSelectedRow] = React.useState<TData | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialFilters);
  const [openFilterId, setOpenFilterId] = React.useState<string | null>(null);

  // Update column visibility when columns change
  React.useEffect(() => {
    setColumnVisibility(prev => ({ ...getInitialColumnVisibility(), ...prev }));
  }, [getInitialColumnVisibility]);

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pageSize),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      pagination: { pageIndex, pageSize },
      sorting,
      columnFilters,
      columnVisibility,
    },
    onPaginationChange: (updater) => {
      const currentPagination = { pageIndex, pageSize };
      const newState = typeof updater === "function" ? updater(currentPagination) : updater;
      if (onPageChange) onPageChange(newState.pageIndex);
      if (onPageSizeChange) onPageSizeChange(newState.pageSize);
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
      // Call parent callback to trigger API call with new sorting
      if (onSortingChange) {
        onSortingChange(newSorting);
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Sincronizar filtros externos com estado interno da tabela
  // Usa JSON.stringify para comparar os valores reais, não a referência do array
  const initialFiltersStr = JSON.stringify(initialFilters);
  React.useEffect(() => {
    if (initialFilters && initialFilters.length > 0) {
      const processedFilters = initialFilters.map(filter => ({
        id: filter.id,
        value: filter.value === "all" ? undefined : filter.value
      }));
      setColumnFilters(processedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltersStr]); // Depende da string serializada para evitar loops infinitos

  // Filtragem, ordenação etc precisam ser refletidos na query backend
  // Para simplificação, agora a paginação já é controlada externamente

  const handleFilterChange = (columnId: string, value: any) => {
    // Para filtros do tipo select com valor "all" ou "ALL", usar undefined para indicar "sem filtro"
    const filterValue = (value === "all" || value === "ALL") ? undefined : value;
    table.getColumn(columnId)?.setFilterValue(filterValue);
    // Call parent callback to trigger API call with filter
    if (onFilterChange) {
      onFilterChange(columnId, value);
    }
  };

  const clearFilter = (columnId: string) => {
    const column = table.getColumn(columnId);
    const filterMeta = column?.columnDef.meta as any;

    // Se for um filtro do tipo select, resetar para "all"
    if (filterMeta?.filterType === "select") {
      table.getColumn(columnId)?.setFilterValue(undefined);
      setOpenFilterId(null);
      if (onFilterChange) {
        onFilterChange(columnId, "all");
      }
    } else {
      table.getColumn(columnId)?.setFilterValue("");
      setOpenFilterId(null);
      if (onFilterChange) {
        onFilterChange(columnId, "");
      }
    }
  };

  const clearAllFilters = () => {
    // Primeiro, obter os valores atuais e preparar as chamadas de callback
    const filtersToReset: Array<{ columnId: string; resetValue: string }> = [];
    table.getAllColumns().forEach((col) => {
      const currentValue = col.getFilterValue();
      if (currentValue !== undefined && currentValue !== "") {
        const filterMeta = col.columnDef.meta as any;
        const resetValue = filterMeta?.filterType === "select" ? "all" : "";
        filtersToReset.push({ columnId: col.id, resetValue });
      }
    });

    // Agora limpar os filtros localmente
    table.getAllColumns().forEach((col) => {
      const filterMeta = col.columnDef.meta as any;
      if (filterMeta?.filterType === "select") {
        col.setFilterValue(undefined);
      } else {
        col.setFilterValue("");
      }
    });
    setOpenFilterId(null);

    // Chamar os callbacks para resetar no backend
    if (onFilterChange && filtersToReset.length > 0) {
      filtersToReset.forEach(({ columnId, resetValue }) => {
        onFilterChange(columnId, resetValue);
      });
    }
  };

  const activeFilters = table.getState().columnFilters.filter(
    (f) => f.value !== undefined && f.value !== ""
  );

  const displayableFilters = activeFilters.filter(filter => {
    if (
      !filter.value ||
      filter.value === "all" ||
      filter.value === "ALL" ||
      (filter.id === "is_active" && filter.value === "active")
    ) {
      return false;
    }
    return true;
  });

  return (
    <Card className="shadow-lg pb-0.5">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-100">
          <div>
            <h2 className="text-xl font-bold text-primary">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {onAdd && (
              <Plus
                className="h-6 w-6 cursor-pointer"
                onClick={onAdd}
                aria-label="Adicionar novo item"
                role="button"
              />
            )}
            {onViewDetails && selectedRow && (
              <Eye
                className="h-6 w-6 cursor-pointer"
                onClick={() => onViewDetails(selectedRow)}
                aria-label="Ver detalhes do item selecionado"
                role="button"
              />
            )}
            {!readOnly && selectedRow && (
              <>
                <Edit
                  className="h-6 w-6 cursor-pointer"
                  onClick={() => onEdit?.(selectedRow)}
                  aria-label="Editar item"
                  role="button"
                />
                <Trash
                  className="h-6 w-6 cursor-pointer"
                  onClick={() => onDelete?.(selectedRow)}
                  aria-label="Excluir item"
                  role="button"
                />
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Settings className="h-6 w-6 cursor-pointer" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    const header = column.columnDef.header;
                    const displayName = typeof header === 'function' ? column.id : (header || column.id);
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onSelect={(e) => {
                          e.preventDefault();
                          column.toggleVisibility(!column.getIsVisible());
                        }}
                      >
                        {displayName}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* TAGS DE FILTROS */}
        {displayableFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {displayableFilters.map((filter) => {
              const column = table.getColumn(filter.id);
              const filterMeta = column?.columnDef.meta as any;
              let displayValue = filter.value;

              // Se for um filtro do tipo select, buscar o label correspondente
              if (filterMeta?.filterType === "select" && filterMeta?.filterOptions) {
                const option = filterMeta.filterOptions.find((opt: any) => opt.value === filter.value);
                if (option && option.value !== "all") {
                  displayValue = option.label;
                } else {
                  return null; // Não mostrar badge quando "Todos" está selecionado ou valor inválido
                }
              }

              const header = column?.columnDef.header;
              const headerDisplay = typeof header === 'function' ? column?.id : (header || column?.id);

              return (
                <Badge
                  key={filter.id}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <span className="font-medium">{headerDisplay}:</span>{" "}
                  <span>{String(displayValue)}</span>
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => clearFilter(filter.id)}
                  />
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="ml-2 text-sm text-red-500"
            >
              Limpar filtros
            </Button>
          </div>
        )}

        <div className="border shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as any;
                    const showFilterIcon = meta?.showFilterIcon;
                    const columnId = header.column.id;
                    const filterValue = header.column.getFilterValue();
                    const isFilterOpen = openFilterId === columnId;
                    const headerDef = header.column.columnDef.header;
                    const headerDisplay = typeof headerDef === 'function' ? header.column.id : (headerDef || header.column.id);

                    return (
                      <TableHead key={header.id} className="font-semibold">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {showFilterIcon && (
                              <div className="relative flex-shrink-0">
                                <Popover
                                  open={isFilterOpen}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setOpenFilterId(columnId);
                                    } else {
                                      setOpenFilterId(null);
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-gray-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenFilterId(isFilterOpen ? null : columnId);
                                      }}
                                    >
                                      <Filter
                                        className={`h-3.5 w-3.5 ${
                                          filterValue
                                            ? "text-primary"
                                            : "text-gray-400"
                                        }`}
                                      />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-60 p-3"
                                    align="start"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium">
                                          Filtrar {headerDisplay}
                                        </h4>
                                        {Boolean(filterValue) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2"
                                            onClick={() => clearFilter(columnId)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      {meta?.filterType === "select" ? (
                                        <Select
                                          value={String(filterValue || "all")}
                                          onValueChange={(value) =>
                                            handleFilterChange(columnId, value)
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecione..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {meta?.filterOptions?.map((option: any) => (
                                              <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input
                                          placeholder={`Filtrar...`}
                                          value={String(filterValue || "")}
                                          onChange={(e) =>
                                            handleFilterChange(
                                              columnId,
                                              e.target.value
                                            )
                                          }
                                          autoFocus
                                        />
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                            <div
                              className="cursor-pointer select-none flex items-center flex-1 min-w-0"
                              onClick={() =>
                                header.column.getCanSort() &&
                                header.column.toggleSorting()
                              }
                            >
                              <span className="truncate">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                              {header.column.getCanSort() && (
                                <span className="ml-1 text-gray-400 flex-shrink-0">
                                  {{
                                    asc: "▲",
                                    desc: "▼",
                                  }[header.column.getIsSorted() as string] ?? "↕"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`hover:bg-gray-50 transition-colors ${
                      (selectedRow as any)?.id === (row.original as any).id ? "bg-gray-200" : ""
                    }`}
                    onClick={() =>
                      setSelectedRow(
                        (selectedRow as any)?.id === (row.original as any).id ? null : row.original
                      )
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const showFilterIcon = (cell.column.columnDef.meta as any)?.showFilterIcon;
                      return (
                        <TableCell key={cell.id} className="py-2">
                          <div className="flex items-center w-full">
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              {showFilterIcon && (
                                <div className="w-7 flex-shrink-0"></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="truncate block">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex items-center justify-between space-x-2 py-2">
          <div className="flex-1 text-sm text-muted-foreground">
            Página {pageIndex + 1} de {Math.ceil(totalCount / pageSize)} —{" "}
            {totalCount} registros
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                onPageSizeChange && onPageSizeChange(Number(value));
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="15">15 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(0)}
              disabled={pageIndex === 0}
            >
              {"<<"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(pageIndex - 1)}
              disabled={pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(pageIndex + 1)}
              disabled={pageIndex >= Math.ceil(totalCount / pageSize) - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(Math.ceil(totalCount / pageSize) - 1)}
              disabled={pageIndex >= Math.ceil(totalCount / pageSize) - 1}
            >
              {">>"}
            </Button>


          </div>
        </div>
      </CardContent>
    </Card>
  );
}
