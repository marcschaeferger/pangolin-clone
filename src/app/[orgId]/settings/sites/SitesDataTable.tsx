"use client";

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    SortingState,
    getSortedRowModel,
    ColumnFiltersState,
    getFilteredRowModel
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@app/components/ui/button";
import { useState } from "react";
import { Input } from "@app/components/ui/input";
import { DataTablePagination } from "@app/components/DataTablePagination";
import { Plus, Search } from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    addSite?: () => void;
}

export function SitesDataTable<TData, TValue>({
    addSite,
    columns,
    data
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState<any>([]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        initialState: {
            pagination: {
                pageSize: 20,
                pageIndex: 0
            }
        },
        state: {
            sorting,
            columnFilters,
            globalFilter
        }
    });

    return (
        <div>
            <div className="flex items-center justify-between pb-4">
                <div className="flex items-center max-w-sm mr-2 w-full relative">
                    <Input
                        placeholder="Search sites"
                        value={globalFilter ?? ""}
                        onChange={(e) =>
                            table.setGlobalFilter(String(e.target.value))
                        }
                        className="w-full pl-8"
                    />
                    <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2" />
                </div>
                <Button
                    onClick={() => {
                        if (addSite) {
                            addSite();
                        }
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Site
                </Button>
            </div>
            <TableContainer>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext()
                                                  )}
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
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No sites. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <div className="mt-4">
                <DataTablePagination table={table} />
            </div>
        </div>
    );
}
