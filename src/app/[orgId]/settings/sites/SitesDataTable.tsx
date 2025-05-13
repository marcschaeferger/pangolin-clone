"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    createSite?: () => void;
}

export function SitesDataTable<TData, TValue>({
    columns,
    data,
    createSite
}: DataTableProps<TData, TValue>) {
    return (
        <DataTable
            columns={columns}
            data={data}
            title="Sites"
            searchPlaceholder="Search sites..."
            searchColumn="name"
            onAdd={createSite}
            addButtonText="Add Site"
            defaultSort={{
                id: "name",
                desc: false
            }}
        />
    );
}
