"use client";

import {
    ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    inviteUser?: () => void;
}

export function UsersDataTable<TData, TValue>({
    columns,
    data,
    inviteUser
}: DataTableProps<TData, TValue>) {
    return (
        <DataTable
            columns={columns}
            data={data}
            title="Users"
            searchPlaceholder="Search users..."
            searchColumn="email"
            onAdd={inviteUser}
            addButtonText="Create User"
        />
    );
}
