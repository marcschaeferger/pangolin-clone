"use client";

import {
    ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    createRole?: () => void;
}

export function RolesDataTable<TData, TValue>({
    columns,
    data,
    createRole
}: DataTableProps<TData, TValue>) {
    return (
        <DataTable
            columns={columns}
            data={data}
            title="Roles"
            searchPlaceholder="Search roles..."
            searchColumn="name"
            onAdd={createRole}
            addButtonText="Add Role"
        />
    );
}
