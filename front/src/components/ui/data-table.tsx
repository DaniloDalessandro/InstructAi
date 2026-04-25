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
    <Card className="border bg-card pb-0 overflow-hidden">
      <CardHeader className="pb-0 gap-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground" style={{ letterSpacing: "-0.2px" }}>{title}</h2>
            {subtitle && (
              <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onAdd && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onAdd}
                aria-label="Adicionar novo item"
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {onViewDetails && selectedRow && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onViewDetails(selectedRow)}
                aria-label="Ver detalhes"
                className="text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {!readOnly && selectedRow && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit?.(selectedRow)}
                  aria-label="Editar item"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete?.(selectedRow)}
                  aria-label="Excluir item"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Button>
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

      <CardContent className="p-0">
        {/* TAGS DE FILTROS */}
        {displayableFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-border">
            {displayableFilters.map((filter) => {
              const column = table.getColumn(filter.id);
              const filterMeta = column?.columnDef.meta as any;
              let displayValue = filter.value;

              if (filterMeta?.filterType === "select" && filterMeta?.filterOptions) {
                const option = filterMeta.filterOptions.find((opt: any) => opt.value === filter.value);
                if (option && option.value !== "all") {
                  displayValue = option.label;
                } else {
                  return null;
                }
              }

              const header = column?.columnDef.header;
              const headerDisplay = typeof header === 'function' ? column?.id : (header || column?.id);

              return (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="flex items-center gap-1 h-6"
                >
                  <span className="text-muted-foreground">{headerDisplay}:</span>{" "}
                  <span className="text-foreground">{String(displayValue)}</span>
                  <X
                    className="h-3 w-3 cursor-pointer ml-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => clearFilter(filter.id)}
                  />
                </Badge>
              );
            })}
            <button
              onClick={clearAllFilters}
              className="text-[12px] text-destructive hover:text-destructive/80 transition-colors px-1"
            >
              Limpar filtros
            </button>
          </div>
        )}

        <div>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as any;
                    const showFilterIcon = meta?.showFilterIcon;
                    const columnId = header.column.id;
                    const filterValue = header.column.getFilterValue();
                    const isFilterOpen = openFilterId === columnId;
                    const headerDef = header.column.columnDef.header;
                    const headerDisplay = typeof headerDef === 'function' ? header.column.id : (headerDef || header.column.id);

                    return (
                      <TableHead key={header.id} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-9">
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
                                    <button
                                      className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenFilterId(isFilterOpen ? null : columnId);
                                      }}
                                    >
                                      <Filter
                                        className={`h-3 w-3 ${
                                          filterValue
                                            ? "text-primary"
                                            : "text-muted-foreground/50"
                                        }`}
                                      />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-56 p-3"
                                    align="start"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-[13px] font-medium">
                                          Filtrar {headerDisplay}
                                        </h4>
                                        {Boolean(filterValue) && (
                                          <button
                                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/5 text-muted-foreground hover:text-foreground"
                                            onClick={() => clearFilter(columnId)}
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                      {meta?.filterType === "select" ? (
                                        <Select
                                          value={String(filterValue || "all")}
                                          onValueChange={(value) =>
                                            handleFilterChange(columnId, value)
                                          }
                                        >
                                          <SelectTrigger className="w-full h-8">
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
                                          placeholder="Filtrar..."
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
                              className="cursor-pointer select-none flex items-center flex-1 min-w-0 gap-1"
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
                                <span className="text-muted-foreground/40 flex-shrink-0 text-[10px]">
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
                    className={`border-b border-border/50 transition-colors cursor-pointer text-[13px] ${
                      (selectedRow as any)?.id === (row.original as any).id
                        ? "bg-white/[0.04]"
                        : "hover:bg-white/[0.02]"
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
                        <TableCell key={cell.id} className="py-2.5">
                          <div className="flex items-center w-full">
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              {showFilterIcon && (
                                <div className="w-6 flex-shrink-0"></div>
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
                  <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground text-[13px]">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">
            Página {pageIndex + 1} de {Math.ceil(totalCount / pageSize) || 1} — {totalCount} registros
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                onPageSizeChange && onPageSizeChange(Number(value));
              }}
            >
              <SelectTrigger className="w-[130px] h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="15">15 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onPageChange && onPageChange(0)}
                disabled={pageIndex === 0}
                className="h-7 w-7 text-muted-foreground"
              >
                {"«"}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onPageChange && onPageChange(pageIndex - 1)}
                disabled={pageIndex === 0}
                className="h-7 w-7 text-muted-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onPageChange && onPageChange(pageIndex + 1)}
                disabled={pageIndex >= Math.ceil(totalCount / pageSize) - 1}
                className="h-7 w-7 text-muted-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onPageChange && onPageChange(Math.ceil(totalCount / pageSize) - 1)}
                disabled={pageIndex >= Math.ceil(totalCount / pageSize) - 1}
                className="h-7 w-7 text-muted-foreground"
              >
                {"»"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
