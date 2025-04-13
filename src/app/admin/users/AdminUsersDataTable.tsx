"use client";

import {
    ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function UsersDataTable<TData, TValue>({
    columns,
    data
}: DataTableProps<TData, TValue>) {
    return (
        <DataTable
            columns={columns}
            data={data}
            title="Server Users"
            searchPlaceholder="Search server users..."
            searchColumn="email"
        />
    );
}
