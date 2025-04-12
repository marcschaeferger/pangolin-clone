"use client";

import {
    ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    createShareLink?: () => void;
}

export function ShareLinksDataTable<TData, TValue>({
    columns,
    data,
    createShareLink
}: DataTableProps<TData, TValue>) {
    return (
        <DataTable
            columns={columns}
            data={data}
            title="Share Links"
            searchPlaceholder="Search share links..."
            searchColumn="name"
            onAdd={createShareLink}
            addButtonText="Create Share Link"
        />
    );
}
